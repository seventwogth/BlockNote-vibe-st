package repository

import (
	"context"
	"database/sql"

	"blocknote/internal/entity"
)

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *entity.Workspace) error
	GetByID(ctx context.Context, id string) (*entity.Workspace, error)
	GetByUserID(ctx context.Context, userID string) ([]entity.Workspace, error)
	Update(ctx context.Context, workspace *entity.Workspace) error
	Delete(ctx context.Context, id string) error
	AddMember(ctx context.Context, member *entity.WorkspaceMember) error
	GetMembers(ctx context.Context, workspaceID string) ([]entity.WorkspaceMember, error)
	RemoveMember(ctx context.Context, workspaceID, userID string) error
}

type workspaceRepository struct {
	db *sql.DB
}

func NewWorkspaceRepository(db *sql.DB) WorkspaceRepository {
	return &workspaceRepository{db: db}
}

func (r *workspaceRepository) Create(ctx context.Context, workspace *entity.Workspace) error {
	query := `
		INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.ExecContext(ctx, query,
		workspace.ID, workspace.Name, workspace.OwnerID, workspace.CreatedAt, workspace.UpdatedAt,
	)
	return err
}

func (r *workspaceRepository) GetByID(ctx context.Context, id string) (*entity.Workspace, error) {
	query := `
		SELECT id, name, owner_id, created_at, updated_at
		FROM workspaces WHERE id = $1
	`
	workspace := &entity.Workspace{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&workspace.ID, &workspace.Name, &workspace.OwnerID, &workspace.CreatedAt, &workspace.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return workspace, nil
}

func (r *workspaceRepository) GetByUserID(ctx context.Context, userID string) ([]entity.Workspace, error) {
	query := `
		SELECT w.id, w.name, w.owner_id, w.created_at, w.updated_at
		FROM workspaces w
		LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE w.owner_id = $1 OR wm.user_id = $1
		ORDER BY w.updated_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []entity.Workspace
	for rows.Next() {
		var w entity.Workspace
		if err := rows.Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		workspaces = append(workspaces, w)
	}
	return workspaces, nil
}

func (r *workspaceRepository) Update(ctx context.Context, workspace *entity.Workspace) error {
	query := `
		UPDATE workspaces SET name = $2, updated_at = $3
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, workspace.ID, workspace.Name, workspace.UpdatedAt)
	return err
}

func (r *workspaceRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM workspaces WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *workspaceRepository) AddMember(ctx context.Context, member *entity.WorkspaceMember) error {
	query := `
		INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3
	`
	_, err := r.db.ExecContext(ctx, query,
		member.WorkspaceID, member.UserID, member.Role, member.CreatedAt,
	)
	return err
}

func (r *workspaceRepository) GetMembers(ctx context.Context, workspaceID string) ([]entity.WorkspaceMember, error) {
	query := `
		SELECT wm.workspace_id, wm.user_id, wm.role, wm.created_at, u.id, u.email, u.name, u.avatar_url
		FROM workspace_members wm
		LEFT JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []entity.WorkspaceMember
	for rows.Next() {
		var m entity.WorkspaceMember
		var userID, email, name, avatarURL *string
		if err := rows.Scan(&m.WorkspaceID, &m.UserID, &m.Role, &m.CreatedAt, &userID, &email, &name, &avatarURL); err != nil {
			return nil, err
		}
		if userID != nil {
			m.User = &entity.User{
				ID:        *userID,
				Email:     *email,
				Name:      *name,
				AvatarURL: *avatarURL,
			}
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *workspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID string) error {
	query := `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`
	_, err := r.db.ExecContext(ctx, query, workspaceID, userID)
	return err
}
