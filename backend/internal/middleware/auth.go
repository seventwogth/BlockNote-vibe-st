package middleware

import (
	"context"
	"net/http"
	"strings"

	"blocknote/internal/service"
)

type AuthMiddleware struct {
	jwtService service.JWTService
}

func NewAuthMiddleware(jwtService service.JWTService) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService: jwtService,
	}
}

func (m *AuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		userID, err := m.jwtService.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type contextKey string

const userIDKey contextKey = "userID"

func GetUserID(r *http.Request) string {
	if userID := r.Context().Value(userIDKey); userID != nil {
		if id, ok := userID.(string); ok {
			return id
		}
	}
	return ""
}
