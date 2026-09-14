package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"agriculturist-web/backend/internal/config"
	"agriculturist-web/backend/internal/pricing"
	"agriculturist-web/backend/internal/cache"

	"github.com/go-chi/chi/v5"
	"log/slog"
	"os"
	"fmt"
	"time"
)

func TestCalculationsHandlerValidatesCrop(t *testing.T) {
	s := &Server{Cfg: config.Config{JWTSecret: "test", CORSOrigins: []string{"*"}}, Log: slog.New(slog.NewTextHandler(os.Stdout, nil))}
	r := s.Router()
	body, _ := json.Marshal(map[string]any{"cropId": "corn", "totalWeight": 1, "qualityMetric": 1, "basePrice": 1})
	req := httptest.NewRequest(http.MethodPost, "/calculations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != 400 && rec.Code != 500 {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRiceFormulaMatchesSpec(t *testing.T) {
	got, err := pricing.Calculate("rice", 1000, 22, 9.5, &pricing.Rule{DeductionRate: 1.5})
	if err != nil {
		t.Fatal(err)
	}
	if got.WeightDeduction != 105 || got.NetWeight != 895 {
		t.Fatalf("%+v", got)
	}
}

func TestRateLimit(t *testing.T) {
	c, err := cache.Connect("redis:6379")
	if err != nil {
		t.Skip("Redis not available, skipping rate limit test")
	}
	defer c.Close()
	
	srv := &Server{
		Cfg:   config.Config{RateLimitPerMin: 2},
		Cache: c,
	}

	r := chi.NewRouter()
	r.Use(srv.rateLimit(srv.Cfg.RateLimitPerMin, "test:rl:"))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	ip := fmt.Sprintf("192.168.1.%d", time.Now().UnixNano()%255)
	
	for i := 1; i <= 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = ip

		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if i <= 2 {
			if rr.Code != http.StatusOK {
				t.Fatalf("request %d should be OK, got %v", i, rr.Code)
			}
		} else {
			if rr.Code != http.StatusTooManyRequests {
				t.Fatalf("request %d should be Rate Limited, got %v", i, rr.Code)
			}
		}
	}
}

func TestJWTSecurity(t *testing.T) {
	s := &Server{Cfg: config.Config{JWTSecret: "test_secret"}, Log: slog.New(slog.NewTextHandler(os.Stdout, nil))}
	r := s.Router()

	req := httptest.NewRequest(http.MethodGet, "/api/transactions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for missing JWT, got %d", rec.Code)
	}

	req.Header.Set("Authorization", "Bearer invalid.token.here")
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for invalid JWT, got %d", rec.Code)
	}
}

func TestUploadOwnership(t *testing.T) {
	s := &Server{Cfg: config.Config{JWTSecret: "test_secret"}, Log: slog.New(slog.NewTextHandler(os.Stdout, nil))}
	r := s.Router()

	req := httptest.NewRequest(http.MethodPost, "/api/receipts", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for missing JWT on upload, got %d", rec.Code)
	}
}
