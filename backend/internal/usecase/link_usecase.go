package usecase

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type LinkUseCase interface {
	GetLinkPreview(ctx context.Context, url string) (*LinkPreview, error)
}

type LinkPreview struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	SiteName    string `json:"siteName"`
}

type linkUseCase struct {
	httpClient *http.Client
}

func NewLinkUseCase() LinkUseCase {
	return &linkUseCase{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (u *linkUseCase) GetLinkPreview(ctx context.Context, url string) (*LinkPreview, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return &LinkPreview{Title: extractDomain(url)}, nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &LinkPreview{Title: extractDomain(url)}, nil
	}

	html := string(body)

	preview := &LinkPreview{
		Title:       extractMeta(html, "og:title", "twitter:title", "title"),
		Description: extractMeta(html, "og:description", "twitter:description", "description"),
		Image:       extractMeta(html, "og:image", "twitter:image"),
		SiteName:    extractMeta(html, "og:site_name"),
	}

	if preview.Title == "" {
		preview.Title = extractDomain(url)
	}

	if preview.Image != "" && !strings.HasPrefix(preview.Image, "http") {
		baseURL, _ := parseURL(url)
		if strings.HasPrefix(preview.Image, "/") {
			preview.Image = baseURL + preview.Image
		}
	}

	return preview, nil
}

func extractMeta(html string, keys ...string) string {
	for _, key := range keys {
		patterns := []string{
			fmt.Sprintf(`<meta[^>]*property=["']%s["'][^>]*content=["']([^"']*)["']`, key),
			fmt.Sprintf(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']%s["']`, key),
			fmt.Sprintf(`<meta[^>]*name=["']%s["'][^>]*content=["']([^"']*)["']`, key),
		}

		for _, pattern := range patterns {
			re := regexp.MustCompile(pattern)
			matches := re.FindStringSubmatch(html)
			if len(matches) > 1 && strings.TrimSpace(matches[1]) != "" {
				return strings.TrimSpace(matches[1])
			}
		}
	}
	return ""
}

func extractDomain(url string) string {
	re := regexp.MustCompile(`https?://([^/]+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	return url
}

func parseURL(url string) (string, error) {
	re := regexp.MustCompile(`(https?://[^/]+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1], nil
	}
	return "", nil
}
