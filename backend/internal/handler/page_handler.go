package handler

import (
	"encoding/base64"
	"encoding/json"
	"log"
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
		log.Printf("page create error: %v", err)
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
		log.Printf("page get error: %v", err)
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
		log.Printf("pages list error: %v", err)
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
		log.Printf("page update error: %v", err)
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
		log.Printf("page delete error: %v", err)
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

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	decoded, err := base64.StdEncoding.DecodeString(req.Content)
	if err != nil {
		http.Error(w, "Invalid base64 content", http.StatusBadRequest)
		return
	}

	if err := h.pageUseCase.UpdateContent(r.Context(), id, decoded); err != nil {
		log.Printf("page content update error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *PageHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	id = strings.TrimSuffix(id, "/archive")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.Archive(r.Context(), id)
	if err != nil {
		if err == usecase.ErrPageNotFound {
			http.Error(w, "Page not found", http.StatusNotFound)
			return
		}
		log.Printf("page archive error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Restore(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	id = strings.TrimSuffix(id, "/restore")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.Restore(r.Context(), id)
	if err != nil {
		log.Printf("page restore error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Move(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	id = strings.TrimSuffix(id, "/move")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	var req entity.MovePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.Move(r.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrPageNotFound {
			http.Error(w, "Page not found", http.StatusNotFound)
			return
		}
		log.Printf("page move error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/pages/")
	id = strings.TrimSuffix(id, "/favorite")
	if id == "" {
		http.Error(w, "Page ID required", http.StatusBadRequest)
		return
	}

	page, err := h.pageUseCase.ToggleFavorite(r.Context(), id)
	if err != nil {
		if err == usecase.ErrPageNotFound {
			http.Error(w, "Page not found", http.StatusNotFound)
			return
		}
		log.Printf("page favorite error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(page)
}

func (h *PageHandler) Recent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := parseInt(limitStr); err == nil {
			limit = l
		}
	}

	pages, err := h.pageUseCase.GetRecent(r.Context(), userID, limit)
	if err != nil {
		log.Printf("recent pages error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func (h *PageHandler) Favorites(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	pages, err := h.pageUseCase.GetFavorites(r.Context(), workspaceID)
	if err != nil {
		log.Printf("favorite pages error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func (h *PageHandler) Archived(w http.ResponseWriter, r *http.Request) {
	workspaceID := r.URL.Query().Get("workspace_id")
	if workspaceID == "" {
		http.Error(w, "Workspace ID required", http.StatusBadRequest)
		return
	}

	pages, err := h.pageUseCase.GetArchived(r.Context(), workspaceID)
	if err != nil {
		log.Printf("archived pages error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func (h *PageHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	pageType := r.URL.Query().Get("type")
	workspaceID := r.URL.Query().Get("workspace_id")

	req := &entity.SearchPageRequest{
		Query:       query,
		PageType:    pageType,
		WorkspaceID: workspaceID,
	}

	pages, err := h.pageUseCase.Search(r.Context(), req)
	if err != nil {
		log.Printf("search error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pages)
}

func parseInt(s string) (int, error) {
	var n int
	_, err := parseIntParams(0, s, &n)
	return n, err
}

func parseIntParams(old int, s string, n *int) (int, error) {
	*n = 0
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return 0, nil
		}
		*n = *n*10 + int(s[i]-'0')
	}
	return *n, nil
}
