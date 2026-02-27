package entity

import (
	"encoding/json"
	"time"
)

type Workspace struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	Icon             string          `json:"icon,omitempty"`
	Description      string          `json:"description,omitempty"`
	OwnerID          string          `json:"owner_id"`
	ParentID         *string         `json:"parent_id,omitempty"`
	WorkspaceGroupID *string         `json:"workspace_group_id,omitempty"`
	IsTextType       bool            `json:"is_text_type"`
	Position         int             `json:"position"`
	Settings         json.RawMessage `json:"settings,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	Children         []Workspace     `json:"children,omitempty"`
	Workspaces       []Workspace     `json:"workspaces,omitempty"`
}

type WorkspaceSettings struct {
	AllowPublicSharing bool   `json:"allow_public_sharing"`
	DefaultPageType    string `json:"default_page_type"`
	EnableComments     bool   `json:"enable_comments"`
}

type WorkspaceGroup struct {
	ID         string           `json:"id"`
	Name       string           `json:"name"`
	Icon       string           `json:"icon,omitempty"`
	OwnerID    string           `json:"owner_id"`
	Position   int              `json:"position"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
	Workspaces []Workspace      `json:"workspaces,omitempty"`
	Groups     []WorkspaceGroup `json:"groups,omitempty"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	User        *User     `json:"user,omitempty"`
}

type CreateWorkspaceRequest struct {
	Name             string  `json:"name"`
	Icon             string  `json:"icon,omitempty"`
	Description      string  `json:"description,omitempty"`
	ParentID         *string `json:"parent_id,omitempty"`
	WorkspaceGroupID *string `json:"workspace_group_id,omitempty"`
	IsTextType       bool    `json:"is_text_type"`
}

type CreateWorkspaceGroupRequest struct {
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}

type UpdateWorkspaceRequest struct {
	Name             *string `json:"name,omitempty"`
	Icon             *string `json:"icon,omitempty"`
	Description      *string `json:"description,omitempty"`
	ParentID         *string `json:"parent_id,omitempty"`
	WorkspaceGroupID *string `json:"workspace_group_id,omitempty"`
	IsTextType       *bool   `json:"is_text_type,omitempty"`
	Position         *int    `json:"position,omitempty"`
}

type UpdateWorkspaceGroupRequest struct {
	Name *string `json:"name,omitempty"`
	Icon *string `json:"icon,omitempty"`
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
