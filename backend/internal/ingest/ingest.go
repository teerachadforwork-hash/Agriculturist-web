package ingest

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"agriculturist-web/backend/internal/forecast"
	"agriculturist-web/backend/internal/metrics"
	"agriculturist-web/backend/internal/notify"
	"agriculturist-web/backend/internal/store"
)

type Config struct {
	DITURL        string
	OAEURL        string
	SugarcaneURL  string
	LINEToken     string
}

type Pipeline struct {
	Store  *store.Store
	Cfg    Config
	Notify *notify.Client
	log    *slog.Logger
	mu     sync.Mutex
	fails  map[string]int
	open   map[string]time.Time
}

func New(st *store.Store, cfg Config, log *slog.Logger) *Pipeline {
	return &Pipeline{
		Store:  st,
		Cfg:    cfg,
		Notify: notify.New(cfg.LINEToken),
		log:    log,
		fails:  map[string]int{},
		open:   map[string]time.Time{},
	}
}

func (p *Pipeline) Run(ctx context.Context) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	prices := map[string]float64{
		"rice":      9.50,
		"cassava":   2.85,
		"sugarcane": 890,
	}
	sources := map[string]string{
		"rice":      "กรมการค้าภายใน",
		"cassava":   "กรมการค้าภายใน",
		"sugarcane": "ราชกิจจานุเบกษา (ราคาอ้อยขั้นต้น)",
	}
	units := map[string]string{"rice": "บาท/กก.", "cassava": "บาท/กก.", "sugarcane": "บาท/ตัน"}

	if dit, err := p.fetchJSON(ctx, "dit", p.Cfg.DITURL); err != nil {
		p.log.Warn("dit ingest degraded", "err", err)
		metrics.IngestRuns.WithLabelValues("dit", "degraded").Inc()
	} else {
		mergeRemote(prices, dit)
		metrics.IngestRuns.WithLabelValues("dit", "ok").Inc()
	}
	if oae, err := p.fetchJSON(ctx, "oae", p.Cfg.OAEURL); err != nil {
		p.log.Warn("oae ingest degraded", "err", err)
		metrics.IngestRuns.WithLabelValues("oae", "degraded").Inc()
	} else {
		mergeRemote(prices, oae)
		metrics.IngestRuns.WithLabelValues("oae", "ok").Inc()
	}
	if cane, err := p.fetchJSON(ctx, "sugarcane", p.Cfg.SugarcaneURL); err != nil {
		p.log.Warn("sugarcane ingest degraded", "err", err)
		metrics.IngestRuns.WithLabelValues("sugarcane", "degraded").Inc()
	} else {
		mergeRemote(prices, cane)
		metrics.IngestRuns.WithLabelValues("sugarcane", "ok").Inc()
	}

	for crop, price := range prices {
		if err := p.Store.UpsertOfficialPrice(ctx, crop, price, units[crop], sources[crop], today); err != nil {
			return err
		}
	}

	if err := p.refreshForecast(ctx); err != nil {
		return err
	}
	return p.notifyWarnings(ctx)
}

func (p *Pipeline) refreshForecast(ctx context.Context) error {
	for _, crop := range []string{"rice", "cassava", "sugarcane"} {
		hist, err := p.Store.SnapshotHistory(ctx, crop)
		if err != nil {
			return err
		}
		pts := make([]forecast.Point, 0, len(hist))
		for _, h := range hist {
			pts = append(pts, forecast.Point{X: h.X, Y: h.Y})
		}
		preds := forecast.LinearPredict(pts, 90)
		last := 0.0
		if len(pts) > 0 {
			last = pts[len(pts)-1].Y
		}
		var rows []map[string]any
		now := time.Now().UTC()
		for i, price := range preds {
			d := now.AddDate(0, 0, i+1)
			conf := math.Max(50, 95-float64(i)*0.4)
			rows = append(rows, map[string]any{
				"date":            d.Format("2006-01-02"),
				"predictedPrice":  forecast.Round2(price),
				"confidenceUpper": forecast.Round2(price * 1.05),
				"confidenceLower": forecast.Round2(price * 0.95),
				"confidence":      math.Round(conf),
				"warningLevel":    "",
			})
		}
		if err := p.Store.ReplacePredictions(ctx, crop, rows); err != nil {
			return err
		}
		future := last
		if len(preds) >= 60 {
			future = preds[59]
		}
		change := 0.0
		if last != 0 {
			change = (future - last) / last * 100
		}
		level, label := forecast.WarningLevel(change)
		title := fmt.Sprintf("พยากรณ์ราคา %s 60 วันข้างหน้า %+0.1f%%", crop, change)
		desc := "คำนวณจาก snapshot รายวันของแหล่งราชการและราคาหน้าลาน ใช้แนวโน้มเชิงเส้นเป็นค่าตั้งต้นก่อนเข้าโมเดล AI เต็มรูปแบบ"
		rec := "ติดตามราคากลางทุก 4 ชั่วโมง และเปรียบเทียบกับราคาหน้าลานก่อนขาย"
		if err := p.Store.UpsertWarning(ctx, "warn-"+crop, crop, level, label, title, desc, rec, now.AddDate(0, 0, 60)); err != nil {
			return err
		}
	}
	return nil
}

func (p *Pipeline) notifyWarnings(ctx context.Context) error {
	warnings, err := p.Store.Warnings(ctx)
	if err != nil {
		return err
	}
	sent := 0
	for _, w := range warnings {
		level, _ := w["warningLevel"].(string)
		if level != "danger" {
			continue
		}
		cropID, _ := w["cropId"].(string)
		title, _ := w["title"].(string)
		ids, err := p.Store.LINEIDsForCrop(ctx, cropID)
		if err != nil {
			return err
		}
		for _, id := range ids {
			if sent >= 200 {
				return nil
			}
			if err := p.Notify.Push(ctx, id, title); err != nil {
				p.log.Warn("line push failed", "err", err)
			}
			sent++
		}
	}
	return nil
}

func (p *Pipeline) fetchJSON(ctx context.Context, source, rawURL string) (map[string]float64, error) {
	if rawURL == "" {
		return nil, fmt.Errorf("%s url not configured", source)
	}
	p.mu.Lock()
	if until, ok := p.open[source]; ok && time.Now().Before(until) {
		p.mu.Unlock()
		return nil, fmt.Errorf("%s circuit open", source)
	}
	p.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	
	// Add 10-second timeout to prevent stalling on government APIs
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		p.trip(source)
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		p.trip(source)
		return nil, fmt.Errorf("%s status %d", source, resp.StatusCode)
	}
	p.reset(source)
	return parsePrices(body), nil
}

func (p *Pipeline) trip(source string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.fails[source]++
	if p.fails[source] >= 3 {
		p.open[source] = time.Now().Add(15 * time.Minute)
	}
}

func (p *Pipeline) reset(source string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.fails[source] = 0
	delete(p.open, source)
}

func parsePrices(body []byte) map[string]float64 {
	out := map[string]float64{}
	var generic map[string]any
	if err := json.Unmarshal(body, &generic); err != nil {
		return out
	}
	for _, key := range []string{"rice", "cassava", "sugarcane"} {
		if v, ok := generic[key]; ok {
			switch n := v.(type) {
			case float64:
				out[key] = n
			case json.Number:
				f, _ := n.Float64()
				out[key] = f
			case string:
				f, _ := strconv.ParseFloat(n, 64)
				out[key] = f
			case map[string]any:
				if p, ok := n["basePrice"].(float64); ok {
					out[key] = p
				} else if p, ok := n["price"].(float64); ok {
					out[key] = p
				}
			}
		}
	}
	return out
}

func mergeRemote(dst, src map[string]float64) {
	for k, v := range src {
		if v > 0 {
			dst[k] = v
		}
	}
}

func (p *Pipeline) Loop(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	if err := p.Run(ctx); err != nil {
		p.log.Error("ingest run failed", "err", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := p.Run(ctx); err != nil {
				p.log.Error("ingest run failed", "err", err)
			}
		}
	}
}
