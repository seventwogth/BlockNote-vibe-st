package entity

import (
	"time"
)

type Asset struct {
	ID          string    `json:"id"`
	WorkspaceID string    `json:"workspace_id"`
	PageID      string    `json:"page_id"`
	UserID      string    `json:"user_id"`
	Filename    string    `json:"filename"`
	S3Key       string    `json:"s3_key"`
	MimeType    string    `json:"mime_type"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
}

type GetUploadURLRequest struct {
	Filename    string `json:"filename"`
	MimeType    string `json:"mime_type"`
	PageID      string `json:"page_id"`
	WorkspaceID string `json:"workspace_id"`
}

type GetUploadURLResponse struct {
	UploadURL   string `json:"upload_url"`
	DownloadURL string `json:"download_url"`
	Key         string `json:"key"`
	ExpiresIn   int    `json:"expires_in"`
	AssetID     string `json:"asset_id"`
}

type GetDownloadURLResponse struct {
	DownloadURL string `json:"download_url"`
	ExpiresIn   int    `json:"expires_in"`
}
