package service

import (
	"errors"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
)

type JWTService interface {
	GenerateToken(userID string) (string, error)
	ValidateToken(tokenString string) (string, error)
}

type jwtService struct {
	secret     string
	expiration time.Duration
}

func NewJWTService(secret string) JWTService {
	return &jwtService{
		secret:     secret,
		expiration: 24 * time.Hour * 7, // 7 days
	}
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (s *jwtService) GenerateToken(userID string) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	log.Printf("JWT: Generated token for userID=%s with secret=%s", userID, s.secret)
	return token.SignedString([]byte(s.secret))
}

func (s *jwtService) ValidateToken(tokenString string) (string, error) {
	log.Printf("JWT: Validating token with secret=%s", s.secret)
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.secret), nil
	})

	if err != nil {
		log.Printf("JWT: Parse error: %v", err)
		return "", ErrInvalidToken
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		log.Printf("JWT: Token valid, userID=%s", claims.UserID)
		return claims.UserID, nil
	}

	log.Printf("JWT: Token invalid")
	return "", ErrInvalidToken
}
