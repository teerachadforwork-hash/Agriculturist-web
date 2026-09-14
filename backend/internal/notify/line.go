package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	token string
}

func New(token string) *Client {
	return &Client{token: token}
}

func (c *Client) Push(ctx context.Context, to, text string) error {
	if c == nil || c.token == "" {
		return nil
	}
	payload := map[string]any{
		"to": to,
		"messages": []map[string]string{
			{"type": "text", "text": text},
		},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.line.me/v2/bot/message/push", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("line push status %d", resp.StatusCode)
	}
	return nil
}
