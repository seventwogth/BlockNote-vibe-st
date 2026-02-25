package usecase

import (
	"context"
	"fmt"
	"io"
	"time"

	"blocknote/internal/entity"
	"blocknote/internal/repository"
	"blocknote/internal/service"
)

type AssetUseCase interface {
	GetUploadURL(ctx context.Context, userID string, req *entity.GetUploadURLRequest) (*entity.GetUploadURLResponse, error)
	GetDownloadURL(ctx context.Context, assetID string) (*entity.GetDownloadURLResponse, error)
	UploadAssetContent(ctx context.Context, assetID string, contentType string, data io.Reader) error
	GetAssetContent(ctx context.Context, assetID string) (io.ReadCloser, string, error)
	DeleteAsset(ctx context.Context, assetID string) error
}

type assetUseCase struct {
	assetRepo repository.AssetRepository
	s3Service service.S3Service
}

func NewAssetUseCase(assetRepo repository.AssetRepository, s3Service service.S3Service) AssetUseCase {
	return &assetUseCase{
		assetRepo: assetRepo,
		s3Service: s3Service,
	}
}

func (u *assetUseCase) GetUploadURL(ctx context.Context, userID string, req *entity.GetUploadURLRequest) (*entity.GetUploadURLResponse, error) {
	assetID := generateUUID()
	key := fmt.Sprintf("assets/%s/%s/%s", req.WorkspaceID, req.PageID, assetID)

	asset := &entity.Asset{
		ID:          assetID,
		WorkspaceID: req.WorkspaceID,
		PageID:      req.PageID,
		UserID:      userID,
		Filename:    req.Filename,
		S3Key:       key,
		MimeType:    req.MimeType,
		Size:        0,
		CreatedAt:   time.Now(),
	}

	if err := u.assetRepo.Create(ctx, asset); err != nil {
		return nil, fmt.Errorf("create asset in repository: %w", err)
	}

	uploadURL := fmt.Sprintf("/api/assets/upload/%s", assetID)
	downloadURL := fmt.Sprintf("/api/assets/file/%s", assetID)

	return &entity.GetUploadURLResponse{
		UploadURL:   uploadURL,
		DownloadURL: downloadURL,
		Key:         key,
		ExpiresIn:   3600,
		AssetID:     assetID,
	}, nil
}

func (u *assetUseCase) GetDownloadURL(ctx context.Context, assetID string) (*entity.GetDownloadURLResponse, error) {
	asset, err := u.assetRepo.GetByID(ctx, assetID)
	if err != nil {
		return nil, err
	}
	downloadURL := fmt.Sprintf("/api/assets/file/%s", asset.ID)

	return &entity.GetDownloadURLResponse{
		DownloadURL: downloadURL,
		ExpiresIn:   3600,
	}, nil
}

func (u *assetUseCase) UploadAssetContent(ctx context.Context, assetID string, contentType string, data io.Reader) error {
	asset, err := u.assetRepo.GetByID(ctx, assetID)
	if err != nil {
		return err
	}
	if err := u.s3Service.UploadObject(ctx, asset.S3Key, contentType, data); err != nil {
		return err
	}
	return nil
}

func (u *assetUseCase) GetAssetContent(ctx context.Context, assetID string) (io.ReadCloser, string, error) {
	asset, err := u.assetRepo.GetByID(ctx, assetID)
	if err != nil {
		return nil, "", err
	}
	body, contentType, err := u.s3Service.GetObject(ctx, asset.S3Key)
	if err != nil {
		return nil, "", err
	}
	return body, contentType, nil
}

func (u *assetUseCase) DeleteAsset(ctx context.Context, assetID string) error {
	asset, err := u.assetRepo.GetByID(ctx, assetID)
	if err != nil {
		return err
	}

	if err := u.s3Service.DeleteObject(ctx, asset.S3Key); err != nil {
		return err
	}

	return u.assetRepo.Delete(ctx, assetID)
}
