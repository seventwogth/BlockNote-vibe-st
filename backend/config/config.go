package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	RedisURL    string
	JWTSecret   string
	S3Endpoint  string
	S3Bucket    string
	S3AccessKey string
	S3SecretKey string
	ServerPort  string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://blocknote:blocknote@localhost:5432/blocknote?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		S3Endpoint:  getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3Bucket:    getEnv("S3_BUCKET", "blocknote"),
		S3AccessKey: getEnv("S3_ACCESS_KEY", "minioadmin"),
		S3SecretKey: getEnv("S3_SECRET_KEY", "minioadmin"),
		ServerPort:  getEnv("SERVER_PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
