package handler

import (
	"encoding/json"
	"io"
	"log"
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

	log.Printf("asset upload-url request: user=%s workspace=%s page=%s filename=%s mime=%s", userID, req.WorkspaceID, req.PageID, req.Filename, req.MimeType)

	resp, err := h.assetUseCase.GetUploadURL(r.Context(), userID, &req)
	if err != nil {
		log.Printf("asset upload-url error: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AssetHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := middleware.GetUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	assetID := strings.TrimPrefix(r.URL.Path, "/api/assets/upload/")
	if assetID == "" {
		http.Error(w, "Asset ID required", http.StatusBadRequest)
		return
	}

	contentType := r.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	log.Printf("asset upload file: user=%s asset_id=%s content_type=%s", userID, assetID, contentType)

	if err := h.assetUseCase.UploadAssetContent(r.Context(), assetID, contentType, r.Body); err != nil {
		log.Printf("asset upload file error: %v", err)
		http.Error(w, "Failed to upload asset", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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

func (h *AssetHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	assetID := strings.TrimPrefix(r.URL.Path, "/api/assets/file/")
	if assetID == "" {
		http.Error(w, "Asset ID required", http.StatusBadRequest)
		return
	}

	body, contentType, err := h.assetUseCase.GetAssetContent(r.Context(), assetID)
	if err != nil {
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	}
	defer body.Close()

	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	if _, err := io.Copy(w, body); err != nil {
		http.Error(w, "Failed to stream asset", http.StatusInternalServerError)
		return
	}
}
