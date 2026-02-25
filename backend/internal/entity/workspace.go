package entity

import (
	"time"
)

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
	User        *User     `json:"user,omitempty"`
}

type CreateWorkspaceRequest struct {
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
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
