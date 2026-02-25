package handler

import (
	"encoding/json"
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
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workspaces)
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
