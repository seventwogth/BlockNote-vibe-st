package entity

import (
	"encoding/json"
	"time"
)

type Trash struct {
	ID           string          `json:"id"`
	ItemType     string          `json:"item_type"`
	ItemID       string          `json:"item_id"`
	WorkspaceID  string          `json:"workspace_id"`
	DeletedBy    *string         `json:"deleted_by,omitempty"`
	OriginalData json.RawMessage `json:"original_data,omitempty"`
	DeletedAt    time.Time       `json:"deleted_at"`
	ExpiresAt    time.Time       `json:"expires_at"`
}

type SharedPage struct {
	ID          string     `json:"id"`
	PageID      string     `json:"page_id"`
	Token       string     `json:"token"`
	AccessLevel string     `json:"access_level"`
	CreatedBy   *string    `json:"created_by,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type CreateSharedPageRequest struct {
	PageID      string     `json:"page_id"`
	AccessLevel string     `json:"access_level"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type ShareResponse struct {
	Token       string     `json:"token"`
	URL         string     `json:"url"`
	AccessLevel string     `json:"access_level"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

const (
	ItemTypePage      = "page"
	ItemTypeWorkspace = "workspace"
	ItemTypeAsset     = "asset"

	AccessLevelView    = "view"
	AccessLevelEdit    = "edit"
	AccessLevelComment = "comment"
)
