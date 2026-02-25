package service

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service interface {
	GenerateUploadURL(ctx context.Context, key string, contentType string, size int64) (uploadURL, downloadURL string, err error)
	GenerateDownloadURL(ctx context.Context, key string) (string, error)
	DeleteObject(ctx context.Context, key string) error
	BucketExists(ctx context.Context) (bool, error)
	CreateBucket(ctx context.Context) error
}

type s3Service struct {
	client        *s3.Client
	presignClient *s3.PresignClient
	bucket        string
	presignExpiry time.Duration
}

type S3Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
}

func NewS3Service(cfg S3Config) (S3Service, error) {
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
		config.WithRegion("us-east-1"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if cfg.Endpoint != "" {
			return aws.Endpoint{
				URL:               cfg.Endpoint,
				HostnameImmutable: true,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	awsCfg.EndpointResolverWithOptions = customResolver

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &s3Service{
		client:        client,
		presignClient: s3.NewPresignClient(client),
		bucket:        cfg.Bucket,
		presignExpiry: 3600 * time.Second,
	}, nil
}

func (s *s3Service) GenerateUploadURL(ctx context.Context, key string, contentType string, size int64) (string, string, error) {
	presignReq, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = s.presignExpiry
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to generate presigned upload URL: %w", err)
	}

	presignGetReq, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = s.presignExpiry
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}

	return presignReq.URL, presignGetReq.URL, nil
}

func (s *s3Service) GenerateDownloadURL(ctx context.Context, key string) (string, error) {
	presignReq, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = s.presignExpiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}
	return presignReq.URL, nil
}

func (s *s3Service) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (s *s3Service) BucketExists(ctx context.Context) (bool, error) {
	_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(s.bucket),
	})
	if err == nil {
		return true, nil
	}
	return false, nil
}

func (s *s3Service) CreateBucket(ctx context.Context) error {
	_, err := s.client.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(s.bucket),
	})
	return err
}
