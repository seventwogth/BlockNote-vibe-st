package handler

import (
	"encoding/json"
	"net/http"

	"blocknote/internal/usecase"
)

type LinkHandler struct {
	linkUseCase usecase.LinkUseCase
}

type LinkPreview struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	SiteName    string `json:"siteName"`
}

func NewLinkHandler(linkUseCase usecase.LinkUseCase) *LinkHandler {
	return &LinkHandler{linkUseCase: linkUseCase}
}

func (h *LinkHandler) Preview(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	preview, err := h.linkUseCase.GetLinkPreview(r.Context(), url)
	if err != nil {
		http.Error(w, "Failed to get link preview", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preview)
}
