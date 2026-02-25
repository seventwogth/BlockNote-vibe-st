package usecase

import (
	"context"
	"errors"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
)

var (
	ErrPageNotFound = errors.New("page not found")
)

type PageUseCase interface {
	Create(ctx context.Context, userID string, req *entity.CreatePageRequest) (*entity.Page, error)
	GetByID(ctx context.Context, id string) (*entity.PageWithContent, error)
	GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error)
	GetTreeByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error)
	Update(ctx context.Context, id string, req *entity.UpdatePageRequest) (*entity.Page, error)
	Delete(ctx context.Context, id string) error
	UpdateContent(ctx context.Context, pageID string, content []byte) error
}

type pageUseCase struct {
	pageRepo repository.PageRepository
}

func NewPageUseCase(pageRepo repository.PageRepository) PageUseCase {
	return &pageUseCase{
		pageRepo: pageRepo,
	}
}

func (u *pageUseCase) Create(ctx context.Context, userID string, req *entity.CreatePageRequest) (*entity.Page, error) {
	now := time.Now()
	title := req.Title
	if title == "" {
		title = "Untitled"
	}

	page := &entity.Page{
		ID:          generateUUID(),
		WorkspaceID: req.WorkspaceID,
		ParentID:    req.ParentID,
		OwnerID:     userID,
		Title:       title,
		Icon:        req.Icon,
		IsArchived:  false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := u.pageRepo.Create(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (u *pageUseCase) GetByID(ctx context.Context, id string) (*entity.PageWithContent, error) {
	page, err := u.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrPageNotFound
	}

	content, err := u.pageRepo.GetContent(ctx, id)
	if err != nil {
		return nil, err
	}

	return &entity.PageWithContent{
		Page:    *page,
		Content: content.Content,
	}, nil
}

func (u *pageUseCase) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	return u.pageRepo.GetByWorkspaceID(ctx, workspaceID)
}

func (u *pageUseCase) GetTreeByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	return u.pageRepo.GetTreeByWorkspaceID(ctx, workspaceID)
}

func (u *pageUseCase) Update(ctx context.Context, id string, req *entity.UpdatePageRequest) (*entity.Page, error) {
	page, err := u.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrPageNotFound
	}

	if req.Title != nil {
		page.Title = *req.Title
	}
	if req.Icon != nil {
		page.Icon = req.Icon
	}
	if req.IsArchived != nil {
		page.IsArchived = *req.IsArchived
	}

	page.UpdatedAt = time.Now()
	if err := u.pageRepo.Update(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (u *pageUseCase) Delete(ctx context.Context, id string) error {
	return u.pageRepo.Delete(ctx, id)
}

func (u *pageUseCase) UpdateContent(ctx context.Context, pageID string, content []byte) error {
	pageContent := &entity.PageContent{
		PageID:    pageID,
		Content:   content,
		UpdatedAt: time.Now(),
	}
	return u.pageRepo.UpdateContent(ctx, pageContent)
}
