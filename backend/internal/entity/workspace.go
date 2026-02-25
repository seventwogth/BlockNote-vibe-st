package entity

import (
	"time"
)

type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Role        string    `json:"role"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateWorkspaceRequest struct {
	Name string `json:"name"`
}

type WorkspaceWithMembers struct {
	Workspace
	Members []WorkspaceMember `json:"members"`
}
