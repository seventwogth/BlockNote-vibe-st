package usecase

import (
	"context"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
	"github.com/google/uuid"
)

func generateUUID() string {
	return uuid.New().String()
}

type WorkspaceUseCase interface {
	Create(ctx context.Context, userID string, req *entity.CreateWorkspaceRequest) (*entity.Workspace, error)
	GetByUserID(ctx context.Context, userID string) ([]entity.Workspace, error)
	GetByID(ctx context.Context, id string) (*entity.Workspace, error)
	Update(ctx context.Context, workspace *entity.Workspace) error
	Delete(ctx context.Context, id string) error
}

type workspaceUseCase struct {
	workspaceRepo repository.WorkspaceRepository
}

func NewWorkspaceUseCase(workspaceRepo repository.WorkspaceRepository) WorkspaceUseCase {
	return &workspaceUseCase{
		workspaceRepo: workspaceRepo,
	}
}

func (u *workspaceUseCase) Create(ctx context.Context, userID string, req *entity.CreateWorkspaceRequest) (*entity.Workspace, error) {
	now := time.Now()
	workspace := &entity.Workspace{
		ID:        generateUUID(),
		Name:      req.Name,
		OwnerID:   userID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := u.workspaceRepo.Create(ctx, workspace); err != nil {
		return nil, err
	}

	member := &entity.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        "owner",
		CreatedAt:   now,
	}

	if err := u.workspaceRepo.AddMember(ctx, member); err != nil {
		return nil, err
	}

	return workspace, nil
}

func (u *workspaceUseCase) GetByUserID(ctx context.Context, userID string) ([]entity.Workspace, error) {
	return u.workspaceRepo.GetByUserID(ctx, userID)
}

func (u *workspaceUseCase) GetByID(ctx context.Context, id string) (*entity.Workspace, error) {
	return u.workspaceRepo.GetByID(ctx, id)
}

func (u *workspaceUseCase) Update(ctx context.Context, workspace *entity.Workspace) error {
	workspace.UpdatedAt = time.Now()
	return u.workspaceRepo.Update(ctx, workspace)
}

func (u *workspaceUseCase) Delete(ctx context.Context, id string) error {
	return u.workspaceRepo.Delete(ctx, id)
}
