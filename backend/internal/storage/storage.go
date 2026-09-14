package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"path"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Store struct {
	client *minio.Client
	bucket string
}

func Connect(endpoint, access, secret, bucket string, useSSL bool) (*Store, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(access, secret, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
	}
	return &Store{client: client, bucket: bucket}, nil
}

func receiptExtension(contentType string) (string, error) {
	switch contentType {
	case "image/jpeg":
		return ".jpg", nil
	case "image/png":
		return ".png", nil
	case "application/pdf":
		return ".pdf", nil
	default:
		return "", fmt.Errorf("unsupported receipt content type: %s", contentType)
	}
}

func (s *Store) PutReceipt(ctx context.Context, userID, filename string, body []byte, contentType string) (string, error) {
	if s == nil || s.client == nil {
		return "", fmt.Errorf("object storage is not configured")
	}

	ext, err := receiptExtension(contentType)
	if err != nil {
		return "", err
	}

	key := path.Join(
		"receipts",
		userID,
		time.Now().Format("2006/01/02"),
		uuid.NewString()+ext,
	)

	_, err = s.client.PutObject(
		ctx,
		s.bucket,
		key,
		bytes.NewReader(body),
		int64(len(body)),
		minio.PutObjectOptions{
			ContentType: contentType,
		},
	)

	return key, err
}

func (s *Store) Get(ctx context.Context, key string) ([]byte, string, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", err
	}
	defer obj.Close()
	info, err := obj.Stat()
	if err != nil {
		return nil, "", err
	}
	b, err := io.ReadAll(obj)
	return b, info.ContentType, err
}
