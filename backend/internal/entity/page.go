package entity

import (
	"encoding/json"
	"time"
)

type Page struct {
	ID           string     `json:"id"`
	WorkspaceID  string     `json:"workspace_id"`
	ParentID     *string    `json:"parent_id,omitempty"`
	OwnerID      string     `json:"owner_id"`
	Title        string     `json:"title"`
	Icon         *string    `json:"icon,omitempty"`
	PageType     string     `json:"page_type"`
	ContentText  string     `json:"content_text,omitempty"`
	IsArchived   bool       `json:"is_archived"`
	IsFavorite   bool       `json:"is_favorite"`
	LastAccessed *time.Time `json:"last_accessed,omitempty"`
	Position     int        `json:"position"`
	Tags         []string   `json:"tags,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Children     []Page     `json:"children,omitempty"`
}

type PageContent struct {
	PageID    string    `json:"page_id"`
	Content   []byte    `json:"content"`
	Version   int       `json:"version"`
	UpdatedAt time.Time `json:"updated_at"`
}

type PageWithContent struct {
	Page
	Content string `json:"content"`
}

type CreatePageRequest struct {
	WorkspaceID string  `json:"workspace_id"`
	ParentID    *string `json:"parent_id,omitempty"`
	Title       string  `json:"title"`
	Icon        *string `json:"icon,omitempty"`
	PageType    string  `json:"page_type"`
}

type UpdatePageRequest struct {
	Title      *string   `json:"title,omitempty"`
	Icon       *string   `json:"icon,omitempty"`
	IsArchived *bool     `json:"is_archived,omitempty"`
	IsFavorite *bool     `json:"is_favorite,omitempty"`
	ParentID   *string   `json:"parent_id,omitempty"`
	Position   *int      `json:"position,omitempty"`
	Tags       *[]string `json:"tags,omitempty"`
}

type MovePageRequest struct {
	ParentID *string `json:"parent_id,omitempty"`
	Position int     `json:"position"`
}

type UpdateContentRequest struct {
	Content     []byte `json:"content"`
	Version     int    `json:"version"`
	ContentText string `json:"content_text,omitempty"`
}

type SearchPageRequest struct {
	Query       string `json:"q"`
	PageType    string `json:"type"`
	WorkspaceID string `json:"workspace_id,omitempty"`
}

type PageVersion struct {
	ID          string    `json:"id"`
	PageID      string    `json:"page_id"`
	Content     []byte    `json:"content"`
	ContentText string    `json:"content_text,omitempty"`
	Version     int       `json:"version"`
	CreatedBy   *string   `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

const (
	PageTypeText  = "text"
	PageTypeBoard = "board"
)

func (p *Page) SetTags(tags []string) {
	p.Tags = tags
}

func (p *Page) GetTags() []string {
	if p.Tags == nil {
		return []string{}
	}
	return p.Tags
}

func (p *Page) TagsJSON() []byte {
	if p.Tags == nil {
		return []byte("[]")
	}
	b, _ := json.Marshal(p.Tags)
	return b
}
