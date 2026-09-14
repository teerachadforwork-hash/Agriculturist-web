package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env              string
	HTTPAddr         string
	DatabaseURL      string
	RedisURL         string
	JWTSecret        string
	JWTExpiry        time.Duration
	CORSOrigins      []string
	LINEChannelID    string
	LINEChannelSecret string
	LINECallbackURL  string
	LINEMessagingTok string
	DITPriceURL      string
	OAECatalogURL    string
	SugarcanePriceURL string
	MinioEndpoint    string
	MinioAccessKey   string
	MinioSecretKey   string
	MinioBucket      string
	MinioUseSSL      bool
	SentryDSN        string
	RateLimitPerMin  int
	GISLimitPerMin   int
}

func Load() Config {
	return Config{
		Env:               getenv("APP_ENV", "development"),
		HTTPAddr:          getenv("HTTP_ADDR", ":8080"),
		DatabaseURL:       getenv("DATABASE_URL", "postgres://agriculturist:agriculturist@localhost:5432/agriculturist?sslmode=disable"),
		RedisURL:          getenv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:         getenv("JWT_SECRET", "dev-only-change-me"),
		JWTExpiry:         durationEnv("JWT_EXPIRY", 12*time.Hour),
		CORSOrigins:       splitCSV(getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8088")),
		LINEChannelID:     os.Getenv("LINE_CHANNEL_ID"),
		LINEChannelSecret: os.Getenv("LINE_CHANNEL_SECRET"),
		LINECallbackURL:   getenv("LINE_CALLBACK_URL", "http://localhost:5173/callback"),
		LINEMessagingTok:  os.Getenv("LINE_MESSAGING_TOKEN"),
		DITPriceURL:       os.Getenv("DIT_PRICE_URL"),
		OAECatalogURL:     os.Getenv("OAE_CATALOG_URL"),
		SugarcanePriceURL: os.Getenv("SUGARCANE_PRICE_URL"),
		MinioEndpoint:     getenv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:    getenv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:    getenv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:       getenv("MINIO_BUCKET", "receipts"),
		MinioUseSSL:       getenv("MINIO_USE_SSL", "false") == "true",
		SentryDSN:         os.Getenv("SENTRY_DSN"),
		RateLimitPerMin:   intEnv("RATE_LIMIT_PER_MIN", 120),
		GISLimitPerMin:    intEnv("GIS_RATE_LIMIT_PER_MIN", 30),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func intEnv(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			if !strings.HasPrefix(p, "http") && p != "*" {
				p = "https://" + p
			}
			out = append(out, p)
		}
	}
	return out
}
