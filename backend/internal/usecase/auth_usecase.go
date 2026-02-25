package usecase

import (
	"context"
	"errors"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
	"blocknote/internal/service"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

type AuthUseCase interface {
	Register(ctx context.Context, req *entity.RegisterRequest) (*entity.AuthResponse, error)
	Login(ctx context.Context, req *entity.LoginRequest) (*entity.AuthResponse, error)
}

type authUseCase struct {
	userRepo   repository.UserRepository
	jwtService service.JWTService
}

func NewAuthUseCase(userRepo repository.UserRepository, jwtService service.JWTService) AuthUseCase {
	return &authUseCase{
		userRepo:   userRepo,
		jwtService: jwtService,
	}
}

func (u *authUseCase) Register(ctx context.Context, req *entity.RegisterRequest) (*entity.AuthResponse, error) {
	existingUser, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, ErrUserAlreadyExists
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &entity.User{
		ID:           generateUUID(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := u.jwtService.GenerateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &entity.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (u *authUseCase) Login(ctx context.Context, req *entity.LoginRequest) (*entity.AuthResponse, error) {
	user, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := u.jwtService.GenerateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &entity.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}
