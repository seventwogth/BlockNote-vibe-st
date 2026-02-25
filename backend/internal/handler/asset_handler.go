package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"blocknote/internal/entity"
	"blocknote/internal/middleware"
	"blocknote/internal/usecase"
)

type AssetHandler struct {
	assetUseCase usecase.AssetUseCase
}

func NewAssetHandler(assetUseCase usecase.AssetUseCase) *AssetHandler {
	return &AssetHandler{
		assetUseCase: assetUseCase,
	}
}

func (h *AssetHandler) GetUploadURL(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req entity.GetUploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.assetUseCase.GetUploadURL(r.Context(), userID, &req)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AssetHandler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
	assetID := strings.TrimPrefix(r.URL.Path, "/api/assets/")
	if assetID == "" {
		http.Error(w, "Asset ID required", http.StatusBadRequest)
		return
	}

	resp, err := h.assetUseCase.GetDownloadURL(r.Context(), assetID)
	if err != nil {
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
