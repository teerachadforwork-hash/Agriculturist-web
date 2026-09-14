package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"agriculturist-web/backend/internal/cache"
	"agriculturist-web/backend/internal/config"
	"agriculturist-web/backend/internal/db"
	"agriculturist-web/backend/internal/httpapi"
	"agriculturist-web/backend/internal/ingest"
	"agriculturist-web/backend/internal/seed"
	"agriculturist-web/backend/internal/storage"
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
	if err := seed.Run(ctx, st); err != nil {
		log.Error("seed", "err", err)
		os.Exit(1)
	}

	c, err := cache.Connect(cfg.RedisURL)
	if err != nil {
		log.Warn("redis unavailable, continuing without cache", "err", err)
		c = &cache.Cache{}
	}
	defer c.Close()

	var files *storage.Store
	if fs, err := storage.Connect(cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey, cfg.MinioBucket, cfg.MinioUseSSL); err != nil {
		log.Warn("minio unavailable", "err", err)
	} else {
		files = fs
	}

	pipe := ingest.New(st, ingest.Config{
		DITURL:       cfg.DITPriceURL,
		OAEURL:       cfg.OAECatalogURL,
		SugarcaneURL: cfg.SugarcanePriceURL,
		LINEToken:    cfg.LINEMessagingTok,
	}, log)

	srv := &httpapi.Server{Cfg: cfg, Store: st, Cache: c, Files: files, Ingest: pipe, Log: log}
	httpSrv := &http.Server{Addr: cfg.HTTPAddr, Handler: srv.Router()}
	go func() {
		log.Info("api listening", "addr", cfg.HTTPAddr, "env", cfg.Env)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("listen", "err", err)
			os.Exit(1)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpSrv.Shutdown(shutdown)
}
