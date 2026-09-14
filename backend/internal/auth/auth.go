package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID     string `json:"uid"`
	LineUserID string `json:"lid"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}

type Tokens struct {
	AccessToken string `json:"token"`
	ExpiresIn   int64  `json:"expiresIn"`
}

func Sign(secret string, userID, lineUserID, role string, ttl time.Duration) (Tokens, error) {
	now := time.Now()
	claims := Claims{
		UserID:     userID,
		LineUserID: lineUserID,
		Role:       role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := t.SignedString([]byte(secret))
	if err != nil {
		return Tokens{}, err
	}
	return Tokens{AccessToken: signed, ExpiresIn: int64(ttl.Seconds())}, nil
}

func Parse(secret, token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func RandomState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func MustUUID() string {
	return uuid.NewString()
}

type LINEProfile struct {
	UserID        string `json:"userId"`
	DisplayName   string `json:"displayName"`
	PictureURL    string `json:"pictureUrl"`
	StatusMessage string `json:"statusMessage"`
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
}

func ExchangeLINECode(ctx context.Context, channelID, channelSecret, redirectURI, code string) (LINEProfile, string, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)
	form.Set("client_id", channelID)
	form.Set("client_secret", channelSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.line.me/oauth2/v2.1/token", strings.NewReader(form.Encode()))
	if err != nil {
		return LINEProfile{}, "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return LINEProfile{}, "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return LINEProfile{}, "", fmt.Errorf("line token exchange failed: %s", strings.TrimSpace(string(body)))
	}
	var tok tokenResponse
	if err := json.Unmarshal(body, &tok); err != nil {
		return LINEProfile{}, "", err
	}

	preq, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.line.me/v2/profile", nil)
	if err != nil {
		return LINEProfile{}, "", err
	}
	preq.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	presp, err := http.DefaultClient.Do(preq)
	if err != nil {
		return LINEProfile{}, "", err
	}
	defer presp.Body.Close()
	pbody, _ := io.ReadAll(presp.Body)
	if presp.StatusCode >= 300 {
		return LINEProfile{}, "", fmt.Errorf("line profile failed: %s", strings.TrimSpace(string(pbody)))
	}
	var profile LINEProfile
	if err := json.Unmarshal(pbody, &profile); err != nil {
		return LINEProfile{}, "", err
	}
	return profile, tok.IDToken, nil
}

func AuthorizeURL(channelID, redirectURI, state string) string {
	q := url.Values{}
	q.Set("response_type", "code")
	q.Set("client_id", channelID)
	q.Set("redirect_uri", redirectURI)
	q.Set("state", state)
	q.Set("scope", "profile openid")
	return "https://access.line.me/oauth2/v2.1/authorize?" + q.Encode()
}
