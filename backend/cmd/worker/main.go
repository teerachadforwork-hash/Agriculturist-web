package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"agriculturist-web/backend/internal/config"
	"agriculturist-web/backend/internal/db"
	"agriculturist-web/backend/internal/ingest"
	"agriculturist-web/backend/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db connect", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}
	st := &store.Store{Pool: pool}
	pipe := ingest.New(st, ingest.Config{
		DITURL:       cfg.DITPriceURL,
		OAEURL:       cfg.OAECatalogURL,
		SugarcaneURL: cfg.SugarcanePriceURL,
		LINEToken:    cfg.LINEMessagingTok,
	}, log)
	log.Info("price worker started", "interval", "4h")
	pipe.Loop(ctx, 4*time.Hour)
}
