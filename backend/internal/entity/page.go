package entity

import (
	"time"
)

type Page struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	ParentID    *string   `json:"parent_id,omitempty"`
	OwnerID     string    `json:"owner_id"`
	Title       string    `json:"title"`
	Icon        *string   `json:"icon,omitempty"`
	PageType    string    `json:"page_type"`
	IsArchived  bool      `json:"is_archived"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Children    []Page    `json:"children,omitempty"`
}

type PageContent struct {
	PageID    string    `json:"page_id"`
	Content   []byte    `json:"content"`
	Version   int       `json:"version"`
	UpdatedAt time.Time `json:"updated_at"`
}

type PageWithContent struct {
	Page
	Content []byte `json:"content"`
}

type CreatePageRequest struct {
	WorkspaceID string  `json:"workspace_id"`
	ParentID    *string `json:"parent_id,omitempty"`
	Title       string  `json:"title"`
	Icon        *string `json:"icon,omitempty"`
	PageType    string  `json:"page_type"`
}

type UpdatePageRequest struct {
	Title      *string `json:"title,omitempty"`
	Icon       *string `json:"icon,omitempty"`
	IsArchived *bool   `json:"is_archived,omitempty"`
}

type UpdateContentRequest struct {
	Content []byte `json:"content"`
	Version int    `json:"version"`
}

const (
	PageTypeText  = "text"
	PageTypeBoard = "board"
)
