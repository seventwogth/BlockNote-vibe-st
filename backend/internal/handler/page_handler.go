package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"blocknote/internal/entity"
	"blocknote/internal/middleware"
	"blocknote/internal/usecase"
)

type PageHandler struct {
	pageUseCase usecase.PageUseCase
}

func NewPageHandler(pageUseCase usecase.PageUseCase) *PageHandler {
	return &PageHandler{
		pageUseCase: pageUseCase,
	}
}

func (h *PageHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req entity.CreatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.Create(r.Context(), userID, &req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.GetByID(r.Context(), id)
	if err != nil {
		if err == usecase.ErrPageNotFound {
			http.Error(w, "Page not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) ListByWorkspace(w http.ResponseWriter, r *http.Request) {
	workspaceID := strings.TrimPrefix(r.URL.Path, "/api/workspaces/")
	workspaceID = strings.TrimSuffix(workspaceID, "/pages")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	pages, err := h.pageUseCase.GetTreeByWorkspaceID(r.Context(), workspaceID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func (h *PageHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	var req entity.UpdatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.Update(r.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrPageNotFound {
			http.Error(w, "Page not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	if err := h.pageUseCase.Delete(r.Context(), id); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *PageHandler) UpdateContent(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	id = strings.TrimSuffix(id, "/update")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.pageUseCase.UpdateContent(r.Context(), id, body); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
