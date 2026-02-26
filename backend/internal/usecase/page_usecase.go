package usecase

import (
	"context"
	"encoding/base64"
	"encoding/json"
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
	Archive(ctx context.Context, id string) (*entity.Page, error)
	Restore(ctx context.Context, id string) (*entity.Page, error)
	Move(ctx context.Context, id string, req *entity.MovePageRequest) (*entity.Page, error)
	ToggleFavorite(ctx context.Context, id string) (*entity.Page, error)
	GetRecent(ctx context.Context, userID string, limit int) ([]entity.Page, error)
	GetFavorites(ctx context.Context, workspaceID string) ([]entity.Page, error)
	GetArchived(ctx context.Context, workspaceID string) ([]entity.Page, error)
	Search(ctx context.Context, req *entity.SearchPageRequest) ([]entity.Page, error)
}

type pageUseCase struct {
	pageRepo  repository.PageRepository
	trashRepo repository.TrashRepository
}

func NewPageUseCase(pageRepo repository.PageRepository, trashRepo ...repository.TrashRepository) PageUseCase {
	usecase := &pageUseCase{
		pageRepo: pageRepo,
	}
	if len(trashRepo) > 0 {
		usecase.trashRepo = trashRepo[0]
	}
	return usecase
}

func (u *pageUseCase) Create(ctx context.Context, userID string, req *entity.CreatePageRequest) (*entity.Page, error) {
	now := time.Now()
	title := req.Title
	if title == "" {
		title = "Untitled"
	}

	pageType := req.PageType
	if pageType == "" {
		pageType = "text"
	}

	page := &entity.Page{
		ID:           generateUUID(),
		WorkspaceID:  req.WorkspaceID,
		ParentID:     req.ParentID,
		OwnerID:      userID,
		Title:        title,
		Icon:         req.Icon,
		PageType:     pageType,
		IsArchived:   false,
		IsFavorite:   false,
		LastAccessed: &now,
		Tags:         []string{},
		CreatedAt:    now,
		UpdatedAt:    now,
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

	now := time.Now()
	page.LastAccessed = &now
	u.pageRepo.Update(ctx, page)

	content, err := u.pageRepo.GetContent(ctx, id)
	if err != nil {
		return nil, err
	}

	var contentStr string
	if len(content.Content) > 0 {
		contentStr = base64.StdEncoding.EncodeToString(content.Content)
	}

	return &entity.PageWithContent{
		Page:    *page,
		Content: contentStr,
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
	if req.IsFavorite != nil {
		page.IsFavorite = *req.IsFavorite
	}
	if req.ParentID != nil {
		page.ParentID = req.ParentID
	}
	if req.Position != nil {
		page.Position = *req.Position
	}
	if req.Tags != nil {
		page.Tags = *req.Tags
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
	if err := u.pageRepo.UpdateContent(ctx, pageContent); err != nil {
		return err
	}

	return nil
}

func (u *pageUseCase) Archive(ctx context.Context, id string) (*entity.Page, error) {
	page, err := u.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrPageNotFound
	}

	trueVal := true
	page.IsArchived = trueVal
	page.UpdatedAt = time.Now()

	if err := u.pageRepo.Update(ctx, page); err != nil {
		return nil, err
	}

	if u.trashRepo != nil {
		originalData, _ := json.Marshal(page)
		trash := &entity.Trash{
			ID:           generateUUID(),
			ItemType:     entity.ItemTypePage,
			ItemID:       id,
			WorkspaceID:  page.WorkspaceID,
			OriginalData: originalData,
			DeletedAt:    time.Now(),
			ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
		}
		u.trashRepo.Create(ctx, trash)
	}

	return page, nil
}

func (u *pageUseCase) Restore(ctx context.Context, id string) (*entity.Page, error) {
	if u.trashRepo == nil {
		return nil, errors.New("trash repository not configured")
	}

	trashItem, err := u.trashRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if trashItem.ItemType != entity.ItemTypePage {
		return nil, errors.New("item is not a page")
	}

	page, err := u.pageRepo.GetByID(ctx, trashItem.ItemID)
	if err != nil {
		return nil, err
	}

	falseVal := false
	page.IsArchived = falseVal
	page.UpdatedAt = time.Now()

	if err := u.pageRepo.Update(ctx, page); err != nil {
		return nil, err
	}

	u.trashRepo.Delete(ctx, id)

	return page, nil
}

func (u *pageUseCase) Move(ctx context.Context, id string, req *entity.MovePageRequest) (*entity.Page, error) {
	page, err := u.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrPageNotFound
	}

	page.ParentID = req.ParentID
	page.Position = req.Position
	page.UpdatedAt = time.Now()

	if err := u.pageRepo.Update(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (u *pageUseCase) ToggleFavorite(ctx context.Context, id string) (*entity.Page, error) {
	page, err := u.pageRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrPageNotFound
	}

	page.IsFavorite = !page.IsFavorite
	page.UpdatedAt = time.Now()

	if err := u.pageRepo.Update(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (u *pageUseCase) GetRecent(ctx context.Context, userID string, limit int) ([]entity.Page, error) {
	return u.pageRepo.GetRecent(ctx, userID, limit)
}

func (u *pageUseCase) GetFavorites(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	return u.pageRepo.GetFavorites(ctx, workspaceID)
}

func (u *pageUseCase) GetArchived(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	return u.pageRepo.GetArchived(ctx, workspaceID)
}

func (u *pageUseCase) Search(ctx context.Context, req *entity.SearchPageRequest) ([]entity.Page, error) {
	return u.pageRepo.Search(ctx, req)
}
