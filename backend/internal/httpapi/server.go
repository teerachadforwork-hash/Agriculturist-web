package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"agriculturist-web/backend/internal/auth"
	"agriculturist-web/backend/internal/cache"
	"agriculturist-web/backend/internal/config"
	"agriculturist-web/backend/internal/ingest"
	"agriculturist-web/backend/internal/metrics"
	"agriculturist-web/backend/internal/pricing"
	"agriculturist-web/backend/internal/storage"
	"agriculturist-web/backend/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Server struct {
	Cfg    config.Config
	Store  *store.Store
	Cache  *cache.Cache
	Files  *storage.Store
	Ingest *ingest.Pipeline
	Log    *slog.Logger
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(s.logRequests)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.Cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))
	r.Use(s.rateLimit(s.Cfg.RateLimitPerMin, "rl:ip:"))

	mount := func(r chi.Router) {
		r.Get("/health", s.health)
		r.Get("/ready", s.ready)
		r.Handle("/metrics", promhttp.Handler())

		r.Get("/auth/line/start", s.authStart)
		r.Get("/auth/line", s.authLine)
		r.Post("/auth/line", s.authLine)
		r.Post("/auth/demo", s.authDemo)
		r.Get("/auth/me", s.withAuth(s.me))
		r.Post("/auth/consent", s.withAuth(s.consent))

		r.Get("/crops", s.crops)
		r.Get("/crops/{id}", s.cropByID)
		r.Get("/pricing-rules/{cropId}", s.pricingRule)

		r.Get("/facilities", s.facilities)
		r.With(s.rateLimit(s.Cfg.GISLimitPerMin, "rl:gis:")).Get("/facilities/nearby", s.nearby)
		r.Get("/facilities/{id}", s.facilityByID)
		r.Get("/facilities/{id}/prices/{cropId}", s.facilityPrice)
		r.Get("/facilities/{id}/reviews", s.reviews)
		r.Post("/facilities/{id}/prices", s.withRole("facility_owner", "admin")(s.postFacilityPrice))

		r.Get("/prices/today", s.todayPrices)
		r.Get("/prices/today/{cropId}", s.todayPrice)
		r.Get("/prices/history/{cropId}", s.history)
		r.Get("/prices/sparklines", s.sparklines)
		r.Get("/predictions/{cropId}", s.predictions)
		r.Get("/warnings", s.warnings)

		r.Post("/calculations", s.calculations)
		r.Get("/transactions", s.transactions)
		r.Post("/transactions", s.withAuth(s.postTransaction))
		r.Post("/reviews", s.withAuth(s.postReview))
		r.Post("/receipts", s.withAuth(s.uploadReceipt))
		r.Post("/admin/ingest", s.withRole("admin")(s.triggerIngest))
	}

	mount(r)
	r.Route("/api", mount)
	return r
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()
		next.ServeHTTP(ww, r)
		path := r.URL.Path
		metrics.HTTPRequests.WithLabelValues(r.Method, path, strconv.Itoa(ww.Status())).Inc()
		metrics.HTTPDuration.WithLabelValues(r.Method, path).Observe(time.Since(start).Seconds())
		s.Log.Info("http",
			"method", r.Method,
			"path", path,
			"status", ww.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
			"ip", r.RemoteAddr,
		)
	})
}

func (s *Server) rateLimit(limit int, prefix string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if s.Cache == nil {
				next.ServeHTTP(w, r)
				return
			}
			n, err := s.Cache.IncrWindow(r.Context(), prefix+r.RemoteAddr, time.Minute)
			if err == nil && int(n) > limit {
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.Pool.Ping(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "not ready"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) authStart(w http.ResponseWriter, r *http.Request) {
	if s.Cfg.LINEChannelID == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "LINE is not configured"})
		return
	}
	state, err := auth.RandomState()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "state error"})
		return
	}
	_ = s.Cache.SetState(r.Context(), state, 10*time.Minute)
	_, _ = s.Store.Pool.Exec(r.Context(), `INSERT INTO oauth_states (state, expires_at) VALUES ($1, now() + interval '10 minutes')`, state)
	writeJSON(w, http.StatusOK, map[string]any{
		"authorizeUrl": auth.AuthorizeURL(s.Cfg.LINEChannelID, s.Cfg.LINECallbackURL, state),
		"state":        state,
	})
}

func (s *Server) authLine(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	redirect := r.URL.Query().Get("redirect_uri")
	state := r.URL.Query().Get("state")
	if r.Method == http.MethodPost {
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		if body["code"] != "" {
			code = body["code"]
		}
		if body["redirectUri"] != "" {
			redirect = body["redirectUri"]
		}
		if body["state"] != "" {
			state = body["state"]
		}
	}
	if code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing code"})
		return
	}
	if redirect == "" {
		redirect = s.Cfg.LINECallbackURL
	}
	if state != "" {
		ok, _ := s.Cache.ConsumeState(r.Context(), state)
		var dbOK bool
		_ = s.Store.Pool.QueryRow(r.Context(), `DELETE FROM oauth_states WHERE state=$1 AND expires_at > now() RETURNING true`, state).Scan(&dbOK)
		if !ok && !dbOK {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid oauth state"})
			return
		}
	}
	if s.Cfg.LINEChannelID == "" || s.Cfg.LINEChannelSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"success": false, "error": "LINE secret is server-only and is not configured"})
		return
	}
	profile, _, err := auth.ExchangeLINECode(r.Context(), s.Cfg.LINEChannelID, s.Cfg.LINEChannelSecret, redirect, code)
	if err != nil {
		s.Log.Error("line exchange", "err", err)
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "Authentication failed"})
		return
	}
	user, err := s.Store.UpsertUserByLINE(r.Context(), profile.UserID, profile.DisplayName, profile.PictureURL)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "user persist failed"})
		return
	}
	tok, err := auth.Sign(s.Cfg.JWTSecret, user.ID, user.LineUserID, user.Role, s.Cfg.JWTExpiry)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": "token failed"})
		return
	}
	s.Store.Audit(r.Context(), user.ID, "auth.line", "users", r.RemoteAddr, map[string]string{"lineUserId": user.LineUserID})
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"token":   tok.AccessToken,
		"expiresIn": tok.ExpiresIn,
		"user":    user,
		"profile": map[string]any{
			"userId":        user.ID,
			"displayName":   user.LineDisplayName,
			"pictureUrl":    user.PictureURL,
			"statusMessage": profile.StatusMessage,
			"role":          user.Role,
		},
	})
}

func (s *Server) authDemo(w http.ResponseWriter, r *http.Request) {
	user, err := s.Store.UpsertUserByLINE(r.Context(), "demo-farmer-001", "เกษตรกรทดลอง", "")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}
	tok, err := auth.Sign(s.Cfg.JWTSecret, user.ID, user.LineUserID, user.Role, s.Cfg.JWTExpiry)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false})
		return
	}
	s.Store.Audit(r.Context(), user.ID, "auth.demo", "users", r.RemoteAddr, nil)
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"token":   tok.AccessToken,
		"user":    user,
		"profile": map[string]any{"userId": user.ID, "displayName": user.LineDisplayName, "pictureUrl": "", "statusMessage": "Local demo", "role": user.Role},
	})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	user, err := s.Store.GetUser(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) consent(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body struct {
		Type    string `json:"type"`
		Granted bool   `json:"granted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}
	if body.Type == "" {
		body.Type = "pdpa"
	}
	if err := s.Store.RecordConsent(r.Context(), claims.UserID, body.Type, body.Granted); err != nil {
		http.Error(w, `{"error":"failed"}`, http.StatusInternalServerError)
		return
	}
	s.Store.Audit(r.Context(), claims.UserID, "pdpa.consent", body.Type, r.RemoteAddr, body)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) crops(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListCrops(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) cropByID(w http.ResponseWriter, r *http.Request) {
	c, err := s.Store.GetCrop(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"not found"}`, 404)
		return
	}
	writeJSON(w, 200, c)
}

func (s *Server) pricingRule(w http.ResponseWriter, r *http.Request) {
	rule, err := s.Store.ActiveRule(r.Context(), chi.URLParam(r, "cropId"))
	if err != nil {
		http.Error(w, `{"error":"not found"}`, 404)
		return
	}
	writeJSON(w, 200, rule)
}

func (s *Server) facilities(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListFacilities(r.Context(), r.URL.Query().Get("cropId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) facilityByID(w http.ResponseWriter, r *http.Request) {
	f, err := s.Store.GetFacility(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"not found"}`, 404)
		return
	}
	writeJSON(w, 200, f)
}

func (s *Server) nearby(w http.ResponseWriter, r *http.Request) {
	metrics.GISQueries.Inc()
	lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	radiusKm, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
	if radiusKm <= 0 {
		radiusKm = 30
	}
	cropID := r.URL.Query().Get("cropId")
	weight, _ := strconv.ParseFloat(r.URL.Query().Get("weight"), 64)
	quality, _ := strconv.ParseFloat(r.URL.Query().Get("quality"), 64)
	key := cache.NearbyKey(lat, lng, radiusKm, cropID, r.URL.Query().Get("weight"))
	var cached []store.Facility
	if ok, _ := s.Cache.GetJSON(r.Context(), key, &cached); ok {
		writeJSON(w, 200, cached)
		return
	}
	list, err := s.Store.Nearby(r.Context(), lng, lat, radiusKm*1000, cropID, 20)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	if cropID != "" && weight > 0 {
		rule, _ := s.Store.ActiveRule(r.Context(), cropID)
		prices, _ := s.Store.TodayPrices(r.Context())
		base := 0.0
		if p, ok := prices[cropID]; ok {
			base = p.BasePrice
		}
		calcWeight := weight
		if cropID == "sugarcane" {
			calcWeight = weight
		}
		result, err := pricing.Calculate(cropID, calcWeight, quality, base, rule)
		if err == nil {
			for i := range list {
				fp, _ := s.Store.FacilityPrice(r.Context(), list[i].ID, cropID)
				list[i].FacilityPrice = fp
				tons := weight
				if cropID != "sugarcane" {
					tons = weight / 1000
				}
				list[i].TransportCost = float64(int(pricing.TransportCost(list[i].Distance, tons) + 0.5))
				rev := result.NetPrice
				if fp != nil {
					switch cropID {
					case "rice":
						rev = result.NetWeight * *fp
					case "cassava":
						rev = weight * (*fp + result.StarchDifference*result.AdjustRate)
					case "sugarcane":
						rev = weight * (*fp + result.CcsDifference*result.CcsRate)
					}
				}
				list[i].FacilityRevenue = float64(int(rev + 0.5))
				list[i].NetProfit = float64(int(rev-list[i].TransportCost+0.5))
			}
		}
	}
	_ = s.Cache.SetJSON(r.Context(), key, list, 2*time.Minute)
	writeJSON(w, 200, list)
}

func (s *Server) facilityPrice(w http.ResponseWriter, r *http.Request) {
	v, err := s.Store.FacilityPrice(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "cropId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, v)
}

func (s *Server) reviews(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.ListReviews(r.Context(), chi.URLParam(r, "id"), true)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) postFacilityPrice(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var body struct {
		CropID string  `json:"cropId"`
		Price  float64 `json:"price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.CropID == "" {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}
	if err := s.Store.UpsertFacilityPrice(r.Context(), chi.URLParam(r, "id"), body.CropID, body.Price, "facility_owner", time.Now().UTC()); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.Store.Audit(r.Context(), claims.UserID, "price.facility", chi.URLParam(r, "id"), r.RemoteAddr, body)
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (s *Server) todayPrices(w http.ResponseWriter, r *http.Request) {
	var cached map[string]store.TodayPrice
	if ok, _ := s.Cache.GetJSON(r.Context(), "prices:today", &cached); ok {
		writeJSON(w, 200, cached)
		return
	}
	prices, err := s.Store.TodayPrices(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	_ = s.Cache.SetJSON(r.Context(), "prices:today", prices, 5*time.Minute)
	writeJSON(w, 200, prices)
}

func (s *Server) todayPrice(w http.ResponseWriter, r *http.Request) {
	prices, err := s.Store.TodayPrices(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	p, ok := prices[chi.URLParam(r, "cropId")]
	if !ok {
		http.Error(w, `{"error":"not found"}`, 404)
		return
	}
	writeJSON(w, 200, p)
}

func (s *Server) history(w http.ResponseWriter, r *http.Request) {
	list, err := s.Store.History(r.Context(), chi.URLParam(r, "cropId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) sparklines(w http.ResponseWriter, r *http.Request) {
	v, err := s.Store.Sparklines(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, v)
}

func (s *Server) predictions(w http.ResponseWriter, r *http.Request) {
	v, err := s.Store.Predictions(r.Context(), chi.URLParam(r, "cropId"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, v)
}

func (s *Server) warnings(w http.ResponseWriter, r *http.Request) {
	v, err := s.Store.Warnings(r.Context())
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, v)
}

func (s *Server) calculations(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CropID        string  `json:"cropId"`
		TotalWeight   float64 `json:"totalWeight"`
		QualityMetric float64 `json:"qualityMetric"`
		BasePrice     float64 `json:"basePrice"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}
	rule, _ := s.Store.ActiveRule(r.Context(), body.CropID)
	if body.BasePrice == 0 {
		prices, _ := s.Store.TodayPrices(r.Context())
		if p, ok := prices[body.CropID]; ok {
			body.BasePrice = p.BasePrice
		}
	}
	result, err := pricing.Calculate(body.CropID, body.TotalWeight, body.QualityMetric, body.BasePrice, rule)
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	userID := ""
	if c, err := bearerClaims(r, s.Cfg.JWTSecret); err == nil {
		userID = c.UserID
	}
	_ = s.Store.SaveCalculation(r.Context(), userID, body.CropID, body.TotalWeight, body.QualityMetric, body.BasePrice, result)
	writeJSON(w, 200, result)
}

func (s *Server) transactions(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if c, err := bearerClaims(r, s.Cfg.JWTSecret); err == nil {
		userID = c.UserID
	} else if userID != "" {
		if resolved, err := s.Store.ResolveUserID(r.Context(), userID); err == nil && resolved != "" {
			userID = resolved
		}
	}
	if userID == "" {
		writeJSON(w, 200, []any{})
		return
	}
	list, err := s.Store.ListTransactions(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, list)
}

func (s *Server) postTransaction(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var t store.Transaction
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}
	t.UserID = claims.UserID
	saved, err := s.Store.SaveTransaction(r.Context(), t)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.Store.Audit(r.Context(), claims.UserID, "transaction.create", saved.ID, r.RemoteAddr, map[string]string{"cropId": saved.CropID})
	writeJSON(w, 200, saved)
}

func (s *Server) postReview(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var rev store.Review
	if err := json.NewDecoder(r.Body).Decode(&rev); err != nil {
		http.Error(w, `{"error":"invalid json"}`, 400)
		return
	}
	rev.UserID = claims.UserID
	if rev.Rating < 1 || rev.Rating > 5 {
		http.Error(w, `{"error":"rating must be 1-5"}`, 400)
		return
	}
	if rev.TransactionID != "" {
		ok, _ := s.Store.HasUserSoldAt(r.Context(), claims.UserID, rev.FacilityID)
		rev.Verified = ok
	}
	saved, err := s.Store.SaveReview(r.Context(), rev)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.Store.Audit(r.Context(), claims.UserID, "review.create", saved.ID, r.RemoteAddr, nil)
	writeJSON(w, 200, saved)
}

func (s *Server) uploadReceipt(w http.ResponseWriter, r *http.Request) {
	if s.Files == nil {
		http.Error(w, `{"error":"storage unavailable"}`, 503)
		return
	}
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		http.Error(w, `{"error":"invalid multipart"}`, 400)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `{"error":"missing file"}`, 400)
		return
	}
	defer file.Close()
	body, _ := io.ReadAll(io.LimitReader(file, 8<<20))
	key, err := s.Files.PutReceipt(r.Context(), hdr.Filename, body, hdr.Header.Get("Content-Type"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, map[string]string{"objectKey": key})
}

func (s *Server) triggerIngest(w http.ResponseWriter, r *http.Request) {
	if err := s.Ingest.Run(r.Context()); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := bearerClaims(r, s.Cfg.JWTSecret)
		if err != nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), claimsKey{}, claims)))
	}
}

func (s *Server) withRole(roles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return s.withAuth(func(w http.ResponseWriter, r *http.Request) {
			claims := claimsFrom(r.Context())
			for _, role := range roles {
				if claims.Role == role {
					next(w, r)
					return
				}
			}
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		})
	}
}

type claimsKey struct{}

func claimsFrom(ctx context.Context) *auth.Claims {
	c, _ := ctx.Value(claimsKey{}).(*auth.Claims)
	return c
}

func bearerClaims(r *http.Request, secret string) (*auth.Claims, error) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return nil, strconv.ErrSyntax
	}
	return auth.Parse(secret, strings.TrimPrefix(h, "Bearer "))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
