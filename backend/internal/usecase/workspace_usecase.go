package usecase

import (
	"context"
	"errors"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
	"github.com/google/uuid"
)

func generateUUID() string {
	return uuid.New().String()
}

var (
	ErrWorkspaceNotFound = errors.New("workspace not found")
	ErrNotAuthorized     = errors.New("not authorized")
	ErrUserNotFound      = errors.New("user not found")
	ErrAlreadyMember     = errors.New("user is already a member")
)

type WorkspaceUseCase interface {
	Create(ctx context.Context, userID string, req *entity.CreateWorkspaceRequest) (*entity.Workspace, error)
	GetByUserID(ctx context.Context, userID string) ([]entity.Workspace, error)
	GetByID(ctx context.Context, id string) (*entity.Workspace, error)
	GetWithMembers(ctx context.Context, id string) (*entity.WorkspaceWithMembers, error)
	Update(ctx context.Context, workspace *entity.Workspace) error
	Delete(ctx context.Context, id string) error
	InviteUser(ctx context.Context, workspaceID, inviterID string, req *entity.InviteUserRequest) (*entity.WorkspaceMember, error)
	RemoveMember(ctx context.Context, workspaceID, memberID, requesterID string) error
	GetMembers(ctx context.Context, workspaceID string) ([]entity.WorkspaceMember, error)
	UpdateMemberRole(ctx context.Context, workspaceID, memberID, requesterID, newRole string) error
	IsMember(ctx context.Context, workspaceID, userID string) (bool, string, error)
}

type workspaceUseCase struct {
	workspaceRepo repository.WorkspaceRepository
	userRepo      repository.UserRepository
}

func NewWorkspaceUseCase(workspaceRepo repository.WorkspaceRepository, userRepo repository.UserRepository) WorkspaceUseCase {
	return &workspaceUseCase{
		workspaceRepo: workspaceRepo,
		userRepo:      userRepo,
	}
}

func (u *workspaceUseCase) Create(ctx context.Context, userID string, req *entity.CreateWorkspaceRequest) (*entity.Workspace, error) {
	now := time.Now()
	workspace := &entity.Workspace{
		ID:        generateUUID(),
		Name:      req.Name,
		Icon:      req.Icon,
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
		Role:        entity.RoleOwner,
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

func (u *workspaceUseCase) GetWithMembers(ctx context.Context, id string) (*entity.WorkspaceWithMembers, error) {
	workspace, err := u.workspaceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrWorkspaceNotFound
	}

	members, err := u.workspaceRepo.GetMembers(ctx, id)
	if err != nil {
		return nil, err
	}

	return &entity.WorkspaceWithMembers{
		Workspace: *workspace,
		Members:   members,
	}, nil
}

func (u *workspaceUseCase) Update(ctx context.Context, workspace *entity.Workspace) error {
	workspace.UpdatedAt = time.Now()
	return u.workspaceRepo.Update(ctx, workspace)
}

func (u *workspaceUseCase) Delete(ctx context.Context, id string) error {
	return u.workspaceRepo.Delete(ctx, id)
}

func (u *workspaceUseCase) InviteUser(ctx context.Context, workspaceID, inviterID string, req *entity.InviteUserRequest) (*entity.WorkspaceMember, error) {
	isMember, role, err := u.IsMember(ctx, workspaceID, inviterID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, ErrNotAuthorized
	}
	if role != entity.RoleOwner && role != entity.RoleAdmin {
		return nil, errors.New("only owner or admin can invite users")
	}

	user, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, ErrUserNotFound
	}

	existingMember, _ := u.workspaceRepo.GetMembers(ctx, workspaceID)
	for _, m := range existingMember {
		if m.UserID == user.ID {
			return nil, ErrAlreadyMember
		}
	}

	role = req.Role
	if role == "" {
		role = entity.RoleEditor
	}

	member := &entity.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		Role:        role,
		CreatedAt:   time.Now(),
		User:        user,
	}

	if err := u.workspaceRepo.AddMember(ctx, member); err != nil {
		return nil, err
	}

	return member, nil
}

func (u *workspaceUseCase) RemoveMember(ctx context.Context, workspaceID, memberID, requesterID string) error {
	isMember, role, err := u.IsMember(ctx, workspaceID, requesterID)
	if err != nil {
		return err
	}
	if !isMember {
		return ErrNotAuthorized
	}

	if requesterID == memberID {
		return nil
	}

	if role != entity.RoleOwner && role != entity.RoleAdmin {
		return errors.New("only owner or admin can remove members")
	}

	members, err := u.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		return err
	}

	for _, m := range members {
		if m.UserID == memberID && m.Role == entity.RoleOwner {
			return errors.New("cannot remove owner")
		}
	}

	return u.workspaceRepo.RemoveMember(ctx, workspaceID, memberID)
}

func (u *workspaceUseCase) GetMembers(ctx context.Context, workspaceID string) ([]entity.WorkspaceMember, error) {
	return u.workspaceRepo.GetMembers(ctx, workspaceID)
}

func (u *workspaceUseCase) UpdateMemberRole(ctx context.Context, workspaceID, memberID, requesterID, newRole string) error {
	isMember, role, err := u.IsMember(ctx, workspaceID, requesterID)
	if err != nil {
		return err
	}
	if !isMember {
		return ErrNotAuthorized
	}
	if role != entity.RoleOwner {
		return errors.New("only owner can change roles")
	}

	members, err := u.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		return err
	}

	for _, m := range members {
		if m.UserID == memberID && m.Role == entity.RoleOwner {
			return errors.New("cannot change owner role")
		}
	}

	member := &entity.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Role:        newRole,
		CreatedAt:   time.Now(),
	}

	return u.workspaceRepo.AddMember(ctx, member)
}

func (u *workspaceUseCase) IsMember(ctx context.Context, workspaceID, userID string) (bool, string, error) {
	workspace, err := u.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return false, "", ErrWorkspaceNotFound
	}

	if workspace.OwnerID == userID {
		return true, entity.RoleOwner, nil
	}

	members, err := u.workspaceRepo.GetMembers(ctx, workspaceID)
	if err != nil {
		return false, "", err
	}

	for _, m := range members {
		if m.UserID == userID {
			return true, m.Role, nil
		}
	}

	return false, "", nil
}
