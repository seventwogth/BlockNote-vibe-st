package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"blocknote/internal/entity"
)

type TrashRepository interface {
	Create(ctx context.Context, trash *entity.Trash) error
	GetByID(ctx context.Context, id string) (*entity.Trash, error)
	GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Trash, error)
	Delete(ctx context.Context, id string) error
	DeleteExpired(ctx context.Context) error
	EmptyWorkspace(ctx context.Context, workspaceID string) error
}

type trashRepository struct {
	db *sql.DB
}

func NewTrashRepository(db *sql.DB) TrashRepository {
	return &trashRepository{db: db}
}

func (r *trashRepository) Create(ctx context.Context, trash *entity.Trash) error {
	query := `
		INSERT INTO trash (id, item_type, item_id, workspace_id, deleted_by, original_data, deleted_at, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.ExecContext(ctx, query,
		trash.ID,
		trash.ItemType,
		trash.ItemID,
		trash.WorkspaceID,
		trash.DeletedBy,
		trash.OriginalData,
		trash.DeletedAt,
		trash.ExpiresAt,
	)
	return err
}

func (r *trashRepository) GetByID(ctx context.Context, id string) (*entity.Trash, error) {
	query := `
		SELECT id, item_type, item_id, workspace_id, deleted_by, original_data, deleted_at, expires_at
		FROM trash WHERE id = $1
	`
	trash := &entity.Trash{}
	var originalData []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&trash.ID,
		&trash.ItemType,
		&trash.ItemID,
		&trash.WorkspaceID,
		&trash.DeletedBy,
		&originalData,
		&trash.DeletedAt,
		&trash.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}

	if len(originalData) > 0 {
		trash.OriginalData = json.RawMessage(originalData)
	}

	return trash, nil
}

func (r *trashRepository) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Trash, error) {
	query := `
		SELECT id, item_type, item_id, workspace_id, deleted_by, original_data, deleted_at, expires_at
		FROM trash WHERE workspace_id = $1 AND expires_at > NOW()
		ORDER BY deleted_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []entity.Trash
	for rows.Next() {
		var t entity.Trash
		var originalData []byte

		if err := rows.Scan(
			&t.ID,
			&t.ItemType,
			&t.ItemID,
			&t.WorkspaceID,
			&t.DeletedBy,
			&originalData,
			&t.DeletedAt,
			&t.ExpiresAt,
		); err != nil {
			return nil, err
		}

		if len(originalData) > 0 {
			t.OriginalData = json.RawMessage(originalData)
		}

		items = append(items, t)
	}

	return items, nil
}

func (r *trashRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM trash WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *trashRepository) DeleteExpired(ctx context.Context) error {
	query := `DELETE FROM trash WHERE expires_at < NOW()`
	_, err := r.db.ExecContext(ctx, query)
	return err
}

func (r *trashRepository) EmptyWorkspace(ctx context.Context, workspaceID string) error {
	query := `DELETE FROM trash WHERE workspace_id = $1`
	_, err := r.db.ExecContext(ctx, query, workspaceID)
	return err
}
