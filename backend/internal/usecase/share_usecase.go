package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
)

var (
	ErrSharedPageNotFound = errors.New("shared page not found")
	ErrPageNotShared      = errors.New("page is not shared")
)

type ShareUseCase interface {
	SharePage(ctx context.Context, userID string, req *entity.CreateSharedPageRequest) (*entity.ShareResponse, error)
	GetSharedPage(ctx context.Context, token string) (*entity.SharedPage, error)
	GetPageShares(ctx context.Context, pageID string) ([]entity.SharedPage, error)
	RevokeShare(ctx context.Context, token string) error
	RevokeAllPageShares(ctx context.Context, pageID string) error
}

type shareUseCase struct {
	sharedPageRepo repository.SharedPageRepository
	pageRepo       repository.PageRepository
}

func NewShareUseCase(
	sharedPageRepo repository.SharedPageRepository,
	pageRepo repository.PageRepository,
) ShareUseCase {
	return &shareUseCase{
		sharedPageRepo: sharedPageRepo,
		pageRepo:       pageRepo,
	}
}

func (u *shareUseCase) SharePage(ctx context.Context, userID string, req *entity.CreateSharedPageRequest) (*entity.ShareResponse, error) {
	_, err := u.pageRepo.GetByID(ctx, req.PageID)
	if err != nil {
		return nil, ErrPageNotFound
	}

	token := generateToken(32)

	accessLevel := req.AccessLevel
	if accessLevel == "" {
		accessLevel = entity.AccessLevelView
	}

	shared := &entity.SharedPage{
		ID:          generateUUID(),
		PageID:      req.PageID,
		Token:       token,
		AccessLevel: accessLevel,
		CreatedBy:   &userID,
		ExpiresAt:   req.ExpiresAt,
		CreatedAt:   time.Now(),
	}

	if err := u.sharedPageRepo.Create(ctx, shared); err != nil {
		return nil, err
	}

	return &entity.ShareResponse{
		Token:       token,
		URL:         "/share/" + token,
		AccessLevel: accessLevel,
		ExpiresAt:   req.ExpiresAt,
	}, nil
}

func (u *shareUseCase) GetSharedPage(ctx context.Context, token string) (*entity.SharedPage, error) {
	shared, err := u.sharedPageRepo.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if shared == nil {
		return nil, ErrSharedPageNotFound
	}

	return shared, nil
}

func (u *shareUseCase) GetPageShares(ctx context.Context, pageID string) ([]entity.SharedPage, error) {
	return u.sharedPageRepo.GetByPageID(ctx, pageID)
}

func (u *shareUseCase) RevokeShare(ctx context.Context, token string) error {
	return u.sharedPageRepo.DeleteByToken(ctx, token)
}

func (u *shareUseCase) RevokeAllPageShares(ctx context.Context, pageID string) error {
	return u.sharedPageRepo.DeleteByPageID(ctx, pageID)
}

func generateToken(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)[:length]
}
