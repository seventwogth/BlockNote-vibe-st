package entity

import (
	"encoding/json"
	"time"
)

type Workspace struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Icon        string          `json:"icon,omitempty"`
	Description string          `json:"description,omitempty"`
	OwnerID     string          `json:"owner_id"`
	Settings    json.RawMessage `json:"settings,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type WorkspaceSettings struct {
	AllowPublicSharing bool   `json:"allow_public_sharing"`
	DefaultPageType    string `json:"default_page_type"`
	EnableComments     bool   `json:"enable_comments"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	User        *User     `json:"user,omitempty"`
}

type CreateWorkspaceRequest struct {
	Name        string `json:"name"`
	Icon        string `json:"icon,omitempty"`
	Description string `json:"description,omitempty"`
}

type UpdateWorkspaceRequest struct {
	Name        *string `json:"name,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	Description *string `json:"description,omitempty"`
}

type InviteUserRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

type WorkspaceWithMembers struct {
	Workspace
	Members []WorkspaceMember `json:"members"`
}

const (
	RoleOwner  = "owner"
	RoleAdmin  = "admin"
	RoleEditor = "editor"
	RoleViewer = "viewer"
)
