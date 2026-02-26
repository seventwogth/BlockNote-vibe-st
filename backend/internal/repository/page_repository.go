package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"blocknote/internal/entity"

	"github.com/lib/pq"
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
	GetRecent(ctx context.Context, userID string, limit int) ([]entity.Page, error)
	GetFavorites(ctx context.Context, workspaceID string) ([]entity.Page, error)
	GetArchived(ctx context.Context, workspaceID string) ([]entity.Page, error)
	Search(ctx context.Context, req *entity.SearchPageRequest) ([]entity.Page, error)
	UpdateContentText(ctx context.Context, pageID string, contentText string) error
	GetByIDWithContent(ctx context.Context, id string) (*entity.PageWithContent, error)
}

type pageRepository struct {
	db *sql.DB
}

func NewPageRepository(db *sql.DB) PageRepository {
	return &pageRepository{db: db}
}

func (r *pageRepository) Create(ctx context.Context, page *entity.Page) error {
	pageType := page.PageType
	if pageType == "" {
		pageType = "text"
	}

	query := `
		INSERT INTO pages (id, workspace_id, parent_id, owner_id, title, icon, page_type, is_archived, is_favorite, position, tags, content_text, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	tags := page.Tags
	if tags == nil {
		tags = []string{}
	}
	_, err := r.db.ExecContext(ctx, query,
		page.ID, page.WorkspaceID, page.ParentID, page.OwnerID, page.Title, page.Icon, pageType, page.IsArchived, page.IsFavorite, page.Position, pq.Array(tags), page.ContentText, page.CreatedAt, page.UpdatedAt,
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
		SELECT id, workspace_id, parent_id, owner_id, title, icon, page_type, COALESCE(content_text, ''), is_archived, is_favorite, COALESCE(last_accessed, created_at), COALESCE(position, 0), tags, created_at, updated_at
		FROM pages WHERE id = $1
	`
	page := &entity.Page{}
	var contentText sql.NullString
	var lastAccessed sql.NullTime
	var tags []sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&page.ID, &page.WorkspaceID, &page.ParentID, &page.OwnerID,
		&page.Title, &page.Icon, &page.PageType, &contentText, &page.IsArchived,
		&page.IsFavorite, &lastAccessed, &page.Position, pq.Array(&tags), &page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	page.ContentText = contentText.String
	if lastAccessed.Valid {
		page.LastAccessed = &lastAccessed.Time
	}

	if len(tags) > 0 {
		page.Tags = make([]string, len(tags))
		for i, t := range tags {
			page.Tags[i] = t.String
		}
	}

	return page, nil
}

func (r *pageRepository) GetByIDWithContent(ctx context.Context, id string) (*entity.PageWithContent, error) {
	page, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	content, err := r.GetContent(ctx, id)
	if err != nil {
		return nil, err
	}

	return &entity.PageWithContent{
		Page:    *page,
		Content: string(content.Content),
	}, nil
}

func (r *pageRepository) GetByWorkspaceID(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, page_type, COALESCE(content_text, ''), is_archived, is_favorite, COALESCE(last_accessed, created_at), COALESCE(position, 0), tags, created_at, updated_at
		FROM pages WHERE workspace_id = $1 AND is_archived = FALSE
		ORDER BY COALESCE(position, 0) ASC, created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanPages(rows)
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

func (r *pageRepository) scanPages(rows *sql.Rows) ([]entity.Page, error) {
	var pages []entity.Page
	for rows.Next() {
		var p entity.Page
		var contentText sql.NullString
		var lastAccessed sql.NullTime
		var tags []sql.NullString

		if err := rows.Scan(
			&p.ID, &p.WorkspaceID, &p.ParentID, &p.OwnerID,
			&p.Title, &p.Icon, &p.PageType, &contentText, &p.IsArchived,
			&p.IsFavorite, &lastAccessed, &p.Position, pq.Array(&tags), &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, err
		}
		p.ContentText = contentText.String
		if lastAccessed.Valid {
			p.LastAccessed = &lastAccessed.Time
		}

		if len(tags) > 0 {
			p.Tags = make([]string, len(tags))
			for i, t := range tags {
				p.Tags[i] = t.String
			}
		}

		pages = append(pages, p)
	}
	return pages, nil
}

func (r *pageRepository) Update(ctx context.Context, page *entity.Page) error {
	query := `
		UPDATE pages SET 
			title = $2, 
			icon = $3, 
			is_archived = $4, 
			is_favorite = $5,
			parent_id = $6,
			position = $7,
			tags = $8,
			content_text = $9,
			last_accessed = $10,
			updated_at = $11
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query,
		page.ID, page.Title, page.Icon, page.IsArchived, page.IsFavorite,
		page.ParentID, page.Position, pq.Array(page.Tags), page.ContentText, page.LastAccessed, page.UpdatedAt,
	)
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

func (r *pageRepository) UpdateContentText(ctx context.Context, pageID string, contentText string) error {
	query := `
		UPDATE pages SET content_text = $2, updated_at = $3
		WHERE id = $1
	`
	_, err := r.db.ExecContext(ctx, query, pageID, contentText, time.Now())
	return err
}

func (r *pageRepository) GetRecent(ctx context.Context, userID string, limit int) ([]entity.Page, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT p.id, p.workspace_id, p.parent_id, p.owner_id, p.title, p.icon, p.page_type, 
		       COALESCE(p.content_text, ''), p.is_archived, p.is_favorite, 
		       COALESCE(p.last_accessed, p.created_at), COALESCE(p.position, 0), 
		       p.tags, p.created_at, p.updated_at
		FROM pages p
		LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
		WHERE (p.owner_id = $1 OR wm.user_id = $1) AND p.is_archived = FALSE
		ORDER BY COALESCE(p.last_accessed, p.updated_at) DESC
		LIMIT $2
	`
	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanPages(rows)
}

func (r *pageRepository) GetFavorites(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, page_type, 
		       COALESCE(content_text, ''), is_archived, is_favorite, 
		       COALESCE(last_accessed, created_at), COALESCE(position, 0), 
		       tags, created_at, updated_at
		FROM pages WHERE workspace_id = $1 AND is_favorite = TRUE AND is_archived = FALSE
		ORDER BY updated_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanPages(rows)
}

func (r *pageRepository) GetArchived(ctx context.Context, workspaceID string) ([]entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, page_type, 
		       COALESCE(content_text, ''), is_archived, is_favorite, 
		       COALESCE(last_accessed, created_at), COALESCE(position, 0), 
		       tags, created_at, updated_at
		FROM pages WHERE workspace_id = $1 AND is_archived = TRUE
		ORDER BY updated_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanPages(rows)
}

func (r *pageRepository) Search(ctx context.Context, req *entity.SearchPageRequest) ([]entity.Page, error) {
	query := `
		SELECT id, workspace_id, parent_id, owner_id, title, icon, page_type, 
		       COALESCE(content_text, ''), is_archived, is_favorite, 
		       COALESCE(last_accessed, created_at), COALESCE(position, 0), 
		       tags, created_at, updated_at
		FROM pages 
		WHERE is_archived = FALSE
	`
	args := []interface{}{}
	argIndex := 1

	if req.WorkspaceID != "" {
		query += fmt.Sprintf(" AND workspace_id = $%d", argIndex)
		args = append(args, req.WorkspaceID)
		argIndex++
	}

	if req.Query != "" {
		searchQuery := "%" + strings.ToLower(req.Query) + "%"
		query += fmt.Sprintf(" AND (LOWER(title) LIKE $%d OR LOWER(content_text) LIKE $%d)", argIndex, argIndex)
		args = append(args, searchQuery)
		argIndex++
	}

	if req.PageType != "" && req.PageType != "all" {
		query += fmt.Sprintf(" AND page_type = $%d", argIndex)
		args = append(args, req.PageType)
		argIndex++
	}

	query += " ORDER BY updated_at DESC LIMIT 50"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanPages(rows)
}
