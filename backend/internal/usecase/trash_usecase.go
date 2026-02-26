package usecase

import (
	"context"
	"errors"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
)

var (
	ErrTrashNotFound = errors.New("trash item not found")
)

type TrashUseCase interface {
	GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Trash, error)
	Restore(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error
	EmptyWorkspace(ctx context.Context, workspaceID string) error
}

type trashUseCase struct {
	trashRepo     repository.TrashRepository
	pageRepo      repository.PageRepository
	workspaceRepo repository.WorkspaceRepository
}

func NewTrashUseCase(
	trashRepo repository.TrashRepository,
	pageRepo repository.PageRepository,
	workspaceRepo repository.WorkspaceRepository,
) TrashUseCase {
	return &trashUseCase{
		trashRepo:     trashRepo,
		pageRepo:      pageRepo,
		workspaceRepo: workspaceRepo,
	}
}

func (u *trashUseCase) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Trash, error) {
	return u.trashRepo.GetByWorkspaceID(ctx, workspaceID)
}

func (u *trashUseCase) Restore(ctx context.Context, id string) error {
	trashItem, err := u.trashRepo.GetByID(ctx, id)
	if err != nil {
		return ErrTrashNotFound
	}

	switch trashItem.ItemType {
	case entity.ItemTypePage:
		page, err := u.pageRepo.GetByID(ctx, trashItem.ItemID)
		if err != nil {
			return err
		}
		falseVal := false
		page.IsArchived = falseVal
		page.UpdatedAt = time.Now()
		return u.pageRepo.Update(ctx, page)

	case entity.ItemTypeWorkspace:
		workspace, err := u.workspaceRepo.GetByID(ctx, trashItem.ItemID)
		if err != nil {
			return err
		}
		workspace.UpdatedAt = time.Now()
		return u.workspaceRepo.Update(ctx, workspace)

	default:
		return errors.New("unknown trash item type")
	}
}

func (u *trashUseCase) Delete(ctx context.Context, id string) error {
	trashItem, err := u.trashRepo.GetByID(ctx, id)
	if err != nil {
		return ErrTrashNotFound
	}

	switch trashItem.ItemType {
	case entity.ItemTypePage:
		return u.pageRepo.Delete(ctx, trashItem.ItemID)
	default:
		return errors.New("unknown trash item type")
	}
}

func (u *trashUseCase) EmptyWorkspace(ctx context.Context, workspaceID string) error {
	trashItems, err := u.trashRepo.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return err
	}

	for _, item := range trashItems {
		if item.ItemType == entity.ItemTypePage {
			u.pageRepo.Delete(ctx, item.ItemID)
		}
	}

	return u.trashRepo.EmptyWorkspace(ctx, workspaceID)
}
