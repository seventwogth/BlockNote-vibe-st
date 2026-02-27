package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"blocknote/internal/entity"
	"blocknote/internal/middleware"
	"blocknote/internal/usecase"
)

type WorkspaceHandler struct {
	workspaceUseCase usecase.WorkspaceUseCase
}

func NewWorkspaceHandler(workspaceUseCase usecase.WorkspaceUseCase) *WorkspaceHandler {
	return &WorkspaceHandler{
		workspaceUseCase: workspaceUseCase,
	}
}

func (h *WorkspaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req entity.CreateWorkspaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	workspace, err := h.workspaceUseCase.Create(r.Context(), userID, &req)
	if err != nil {
		log.Printf("workspace create error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspace)
}

func (h *WorkspaceHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	workspaces, err := h.workspaceUseCase.GetByUserID(r.Context(), userID)
	if err != nil {
		log.Printf("workspace list error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"groups":     []interface{}{},
		"workspaces": workspaces,
	})
}

func (h *WorkspaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	if id == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	workspace, err := h.workspaceUseCase.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Workspace not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspace)
}

func (h *WorkspaceHandler) GetWithMembers(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	id = strings.TrimSuffix(id, "/members")
	if id == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	workspace, err := h.workspaceUseCase.GetWithMembers(r.Context(), id)
	if err != nil {
		http.Error(w, "Workspace not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspace)
}

func (h *WorkspaceHandler) Invite(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	workspaceID := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	workspaceID = strings.TrimSuffix(workspaceID, "/invite")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	var req entity.InviteUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	member, err := h.workspaceUseCase.InviteUser(r.Context(), workspaceID, userID, &req)
	if err != nil {
		switch err {
		case usecase.ErrUserNotFound:
			http.Error(w, "User not found", http.StatusNotFound)
		case usecase.ErrNotAuthorized:
			http.Error(w, err.Error(), http.StatusForbidden)
		case usecase.ErrAlreadyMember:
			http.Error(w, err.Error(), http.StatusConflict)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}

func (h *WorkspaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	parts := strings.Split(path, "/members/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	workspaceID := parts[0]
	memberID := parts[1]

	err := h.workspaceUseCase.RemoveMember(r.Context(), workspaceID, memberID, userID)
	if err != nil {
		switch err {
		case usecase.ErrNotAuthorized:
			http.Error(w, err.Error(), http.StatusForbidden)
		default:
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *WorkspaceHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	parts := strings.Split(path, "/members/")
	if len(parts) != 2 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	workspaceID := parts[0]
	memberID := parts[1]

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := h.workspaceUseCase.UpdateMemberRole(r.Context(), workspaceID, memberID, userID, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *WorkspaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	workspaceID := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	workspace, err := h.workspaceUseCase.GetByID(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, "Workspace not found", http.StatusNotFound)
		return
	}

	isMember, _, err := h.workspaceUseCase.IsMember(r.Context(), workspaceID, userID)
	if err != nil || !isMember {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	var req struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		workspace.Name = req.Name
	}
	if req.Icon != "" {
		workspace.Icon = req.Icon
	}

	if err := h.workspaceUseCase.Update(r.Context(), workspace); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspace)
}

func (h *WorkspaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	workspaceID := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	workspace, err := h.workspaceUseCase.GetByID(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, "Workspace not found", http.StatusNotFound)
		return
	}

	if workspace.OwnerID != userID {
		http.Error(w, "Only owner can delete workspace", http.StatusForbidden)
		return
	}

	if err := h.workspaceUseCase.Delete(r.Context(), workspaceID); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
