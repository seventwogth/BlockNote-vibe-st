package repository

import (
	"context"
	"database/sql"
	"time"

	"blocknote/internal/entity"
)

type SharedPageRepository interface {
	Create(ctx context.Context, shared *entity.SharedPage) error
	GetByID(ctx context.Context, id string) (*entity.SharedPage, error)
	GetByToken(ctx context.Context, token string) (*entity.SharedPage, error)
	GetByPageID(ctx context.Context, pageID string) ([]entity.SharedPage, error)
	Delete(ctx context.Context, id string) error
	DeleteByToken(ctx context.Context, token string) error
	DeleteByPageID(ctx context.Context, pageID string) error
}

type sharedPageRepository struct {
	db *sql.DB
}

func NewSharedPageRepository(db *sql.DB) SharedPageRepository {
	return &sharedPageRepository{db: db}
}

func (r *sharedPageRepository) Create(ctx context.Context, shared *entity.SharedPage) error {
	query := `
		INSERT INTO shared_pages (id, page_id, token, access_level, created_by, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query,
		shared.ID,
		shared.PageID,
		shared.Token,
		shared.AccessLevel,
		shared.CreatedBy,
		shared.ExpiresAt,
		shared.CreatedAt,
	)
	return err
}

func (r *sharedPageRepository) GetByID(ctx context.Context, id string) (*entity.SharedPage, error) {
	query := `
		SELECT id, page_id, token, access_level, created_by, expires_at, created_at
		FROM shared_pages WHERE id = $1
	`
	shared := &entity.SharedPage{}
	var expiresAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shared.ID,
		&shared.PageID,
		&shared.Token,
		&shared.AccessLevel,
		&shared.CreatedBy,
		&expiresAt,
		&shared.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if expiresAt.Valid {
		shared.ExpiresAt = &expiresAt.Time
	}

	return shared, nil
}

func (r *sharedPageRepository) GetByToken(ctx context.Context, token string) (*entity.SharedPage, error) {
	query := `
		SELECT id, page_id, token, access_level, created_by, expires_at, created_at
		FROM shared_pages WHERE token = $1
	`
	shared := &entity.SharedPage{}
	var expiresAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&shared.ID,
		&shared.PageID,
		&shared.Token,
		&shared.AccessLevel,
		&shared.CreatedBy,
		&expiresAt,
		&shared.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if expiresAt.Valid {
		shared.ExpiresAt = &expiresAt.Time
	}

	// Check if expired
	if shared.ExpiresAt != nil && shared.ExpiresAt.Before(time.Now()) {
		return nil, nil
	}

	return shared, nil
}

func (r *sharedPageRepository) GetByPageID(ctx context.Context, pageID string) ([]entity.SharedPage, error) {
	query := `
		SELECT id, page_id, token, access_level, created_by, expires_at, created_at
		FROM shared_pages WHERE page_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []entity.SharedPage
	for rows.Next() {
		var s entity.SharedPage
		var expiresAt sql.NullTime

		if err := rows.Scan(
			&s.ID,
			&s.PageID,
			&s.Token,
			&s.AccessLevel,
			&s.CreatedBy,
			&expiresAt,
			&s.CreatedAt,
		); err != nil {
			return nil, err
		}

		if expiresAt.Valid {
			s.ExpiresAt = &expiresAt.Time
		}

		items = append(items, s)
	}

	return items, nil
}

func (r *sharedPageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM shared_pages WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *sharedPageRepository) DeleteByToken(ctx context.Context, token string) error {
	query := `DELETE FROM shared_pages WHERE token = $1`
	_, err := r.db.ExecContext(ctx, query, token)
	return err
}

func (r *sharedPageRepository) DeleteByPageID(ctx context.Context, pageID string) error {
	query := `DELETE FROM shared_pages WHERE page_id = $1`
	_, err := r.db.ExecContext(ctx, query, pageID)
	return err
}
