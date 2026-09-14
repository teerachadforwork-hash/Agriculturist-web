package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HTTPRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "agriculturist_http_requests_total",
		Help: "HTTP requests",
	}, []string{"method", "path", "status"})

	HTTPDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "agriculturist_http_request_duration_seconds",
		Help:    "HTTP latency",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "path"})

	GISQueries = promauto.NewCounter(prometheus.CounterOpts{
		Name: "agriculturist_gis_queries_total",
		Help: "Nearby facility GIS queries",
	})

	IngestRuns = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "agriculturist_ingest_runs_total",
		Help: "Price ingest runs",
	}, []string{"source", "result"})
)
