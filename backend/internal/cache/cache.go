package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	rdb *redis.Client
}

func Connect(url string) (*Cache, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Cache{rdb: rdb}, nil
}

func (c *Cache) GetJSON(ctx context.Context, key string, dest any) (bool, error) {
	if c == nil || c.rdb == nil {
		return false, nil
	}
	val, err := c.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal(val, dest)
}

func (c *Cache) SetJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	if c == nil || c.rdb == nil {
		return nil
	}
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, b, ttl).Err()
}

func (c *Cache) IncrWindow(ctx context.Context, key string, window time.Duration) (int64, error) {
	if c == nil || c.rdb == nil {
		return 1, nil
	}
	pipe := c.rdb.TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return incr.Val(), nil
}

func (c *Cache) SetState(ctx context.Context, state string, ttl time.Duration) error {
	if c == nil || c.rdb == nil {
		return nil
	}
	return c.rdb.Set(ctx, "oauth:state:"+state, "1", ttl).Err()
}

func (c *Cache) ConsumeState(ctx context.Context, state string) (bool, error) {
	if c == nil || c.rdb == nil {
		return true, nil
	}
	n, err := c.rdb.Del(ctx, "oauth:state:"+state).Result()
	return n > 0, err
}

func NearbyKey(lat, lng, radius float64, crop, extra string) string {
	return fmt.Sprintf("gis:nearby:%.3f:%.3f:%.0f:%s:%s", lat, lng, radius, crop, extra)
}

func (c *Cache) Close() error {
	if c == nil || c.rdb == nil {
		return nil
	}
	return c.rdb.Close()
}
