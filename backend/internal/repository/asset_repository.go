package repository

import (
	"context"
	"database/sql"

	"blocknote/internal/entity"
)

type AssetRepository interface {
	Create(ctx context.Context, asset *entity.Asset) error
	GetByID(ctx context.Context, id string) (*entity.Asset, error)
	GetByPageID(ctx context.Context, pageID string) ([]entity.Asset, error)
	Delete(ctx context.Context, id string) error
}

type assetRepository struct {
	db *sql.DB
}

func NewAssetRepository(db *sql.DB) AssetRepository {
	return &assetRepository{db: db}
}

func (r *assetRepository) Create(ctx context.Context, asset *entity.Asset) error {
	query := `
		INSERT INTO assets (id, workspace_id, page_id, user_id, filename, s3_key, mime_type, size, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		asset.ID, asset.WorkspaceID, asset.PageID, asset.UserID,
		asset.Filename, asset.S3Key, asset.MimeType, asset.Size, asset.CreatedAt,
	)
	return err
}

func (r *assetRepository) GetByID(ctx context.Context, id string) (*entity.Asset, error) {
	query := `
		SELECT id, workspace_id, page_id, user_id, filename, s3_key, mime_type, size, created_at
		FROM assets WHERE id = $1
	`
	asset := &entity.Asset{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&asset.ID, &asset.WorkspaceID, &asset.PageID, &asset.UserID,
		&asset.Filename, &asset.S3Key, &asset.MimeType, &asset.Size, &asset.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return asset, nil
}

func (r *assetRepository) GetByPageID(ctx context.Context, pageID string) ([]entity.Asset, error) {
	query := `
		SELECT id, workspace_id, page_id, user_id, filename, s3_key, mime_type, size, created_at
		FROM assets WHERE page_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []entity.Asset
	for rows.Next() {
		var a entity.Asset
		if err := rows.Scan(&a.ID, &a.WorkspaceID, &a.PageID, &a.UserID, &a.Filename, &a.S3Key, &a.MimeType, &a.Size, &a.CreatedAt); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	return assets, nil
}

func (r *assetRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM assets WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
