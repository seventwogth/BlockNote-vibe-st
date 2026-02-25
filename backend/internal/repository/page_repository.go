package repository

import (
	"context"
	"database/sql"

	"blocknote/internal/entity"
)

type PageRepository interface {
	Create(ctx context.Context, page *entity.Page) error
	GetByID(ctx context.Context, id string) (*entity.Page, error)
	GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error)
	GetTreeByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error)
	Update(ctx context.Context, page *entity.Page) error
	Delete(ctx context.Context, id string) error
	GetContent(ctx context.Context, pageID string) (*entity.PageContent, error)
	UpdateContent(ctx context.Context, content *entity.PageContent) error
}

type pageRepository struct {
	db *sql.DB
}

func NewPageRepository(db *sql.DB) PageRepository {
	return &pageRepository{db: db}
}

func (r *pageRepository) Create(ctx context.Context, page *entity.Page) error {
	query := `
		INSERT INTO pages (id, workspace_id, parent_id, owner_id, title, icon, is_archived, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		page.ID, page.WorkspaceID, page.ParentID, page.OwnerID, page.Title, page.Icon, page.IsArchived, page.CreatedAt, page.UpdatedAt,
	)
	if err != nil {
		return err
	}

	contentQuery := `
		INSERT INTO page_contents (page_id, content, version, updated_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err = r.db.ExecContext(ctx, contentQuery, page.ID, []byte{}, 0, page.CreatedAt)
	return err
}

func (r *pageRepository) GetByID(ctx context.Context, id string) (*entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, is_archived, created_at, updated_at
		FROM pages WHERE id = $1
	`
	page := &entity.Page{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&page.ID, &page.WorkspaceID, &page.ParentID, &page.OwnerID,
		&page.Title, &page.Icon, &page.IsArchived, &page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return page, nil
}

func (r *pageRepository) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, is_archived, created_at, updated_at
		FROM pages WHERE workspace_id = $1 AND is_archived = FALSE
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []entity.Page
	for rows.Next() {
		var p entity.Page
		if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.ParentID, &p.OwnerID, &p.Title, &p.Icon, &p.IsArchived, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

func (r *pageRepository) GetTreeByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	pages, err := r.GetByWorkspaceID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	tree := buildPageTree(pages)
	return tree, nil
}

func buildPageTree(pages []entity.Page) []entity.Page {
	pageMap := make(map[string]*entity.Page)
	var rootPages []entity.Page

	for i := range pages {
		p := &pages[i]
		pageMap[p.ID] = p
	}

	for i := range pages {
		p := &pages[i]
		if p.ParentID == nil {
			rootPages = append(rootPages, *p)
		} else {
			if parent, ok := pageMap[*p.ParentID]; ok {
				parent.Children = append(parent.Children, *p)
			}
		}
	}

	return rootPages
}

func (r *pageRepository) Update(ctx context.Context, page *entity.Page) error {
	query := `
		UPDATE pages SET title = $2, icon = $3, is_archived = $4, updated_at = $5
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, page.ID, page.Title, page.Icon, page.IsArchived, page.UpdatedAt)
	return err
}

func (r *pageRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM pages WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *pageRepository) GetContent(ctx context.Context, pageID string) (*entity.PageContent, error) {
	query := `
		SELECT page_id, content, version, updated_at
		FROM page_contents WHERE page_id = $1
	`
	content := &entity.PageContent{}
	err := r.db.QueryRowContext(ctx, query, pageID).Scan(
		&content.PageID, &content.Content, &content.Version, &content.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return content, nil
}

func (r *pageRepository) UpdateContent(ctx context.Context, content *entity.PageContent) error {
	query := `
		UPDATE page_contents SET content = $2, version = version + 1, updated_at = $3
		WHERE page_id = $1
	`
	_, err := r.db.ExecContext(ctx, query, content.PageID, content.Content, content.UpdatedAt)
	return err
}
