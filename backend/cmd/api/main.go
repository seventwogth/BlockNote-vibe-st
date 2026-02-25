package main

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"blocknote/config"
	"blocknote/internal/handler"
	"blocknote/internal/middleware"
	"blocknote/internal/repository"
	"blocknote/internal/service"
	"blocknote/internal/usecase"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Printf("Warning: Database ping returned error (may be expected): %v", err)
	}

	userRepo := repository.NewUserRepository(db)
	workspaceRepo := repository.NewWorkspaceRepository(db)
	pageRepo := repository.NewPageRepository(db)
	assetRepo := repository.NewAssetRepository(db)

	jwtService := service.NewJWTService(cfg.JWTSecret)

	s3Config := service.S3Config{
		Endpoint:  cfg.S3Endpoint,
		AccessKey: cfg.S3AccessKey,
		SecretKey: cfg.S3SecretKey,
		Bucket:    cfg.S3Bucket,
	}
	s3Service, err := service.NewS3Service(s3Config)
	if err != nil {
		log.Printf("Warning: Failed to initialize S3 service: %v", err)
	}

	authUseCase := usecase.NewAuthUseCase(userRepo, jwtService)
	workspaceUseCase := usecase.NewWorkspaceUseCase(workspaceRepo, userRepo)
	pageUseCase := usecase.NewPageUseCase(pageRepo)
	assetUseCase := usecase.NewAssetUseCase(assetRepo, s3Service)

	authHandler := handler.NewAuthHandler(authUseCase)
	workspaceHandler := handler.NewWorkspaceHandler(workspaceUseCase)
	pageHandler := handler.NewPageHandler(pageUseCase)
	assetHandler := handler.NewAssetHandler(assetUseCase)

	hub := handler.NewHub()
	go hub.Run()
	wsHandler := handler.NewWebSocketHandler(hub)

	authMiddleware := middleware.NewAuthMiddleware(jwtService)

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Request: %s %s", r.Method, r.URL.Path)
	})

	mux.HandleFunc("/api/auth/register", authHandler.Register)
	mux.HandleFunc("/api/auth/login", authHandler.Login)

	mux.HandleFunc("/api/workspaces", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			authMiddleware.Handler(http.HandlerFunc(workspaceHandler.List)).ServeHTTP(w, r)
		case http.MethodPost:
			authMiddleware.Handler(http.HandlerFunc(workspaceHandler.Create)).ServeHTTP(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/workspaces/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		if strings.HasSuffix(path, "/pages") {
			workspaceID := strings.TrimSuffix(strings.TrimPrefix(path, "/api/workspaces/"), "/pages")
			r.URL.Path = "/api/workspaces/" + workspaceID + "/pages"
			pageHandler.ListByWorkspace(w, r)
			return
		}

		if strings.HasSuffix(path, "/members") {
			workspaceID := strings.TrimSuffix(strings.TrimPrefix(path, "/api/workspaces/"), "/members")
			r.URL.Path = "/api/workspaces/" + workspaceID + "/members"
			authMiddleware.Handler(http.HandlerFunc(workspaceHandler.GetWithMembers)).ServeHTTP(w, r)
			return
		}

		if strings.HasSuffix(path, "/invite") {
			workspaceID := strings.TrimSuffix(strings.TrimPrefix(path, "/api/workspaces/"), "/invite")
			r.URL.Path = "/api/workspaces/" + workspaceID + "/invite"
			authMiddleware.Handler(http.HandlerFunc(workspaceHandler.Invite)).ServeHTTP(w, r)
			return
		}

		if strings.Contains(path, "/members/") {
			authMiddleware.Handler(http.HandlerFunc(workspaceHandler.RemoveMember)).ServeHTTP(w, r)
			return
		}

		authMiddleware.Handler(http.HandlerFunc(workspaceHandler.Get)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/pages", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			authMiddleware.Handler(http.HandlerFunc(pageHandler.Create)).ServeHTTP(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/pages/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/update") {
			authMiddleware.Handler(http.HandlerFunc(pageHandler.UpdateContent)).ServeHTTP(w, r)
			return
		}
		authMiddleware.Handler(http.HandlerFunc(pageHandler.Get)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/assets/upload-url", func(w http.ResponseWriter, r *http.Request) {
		authMiddleware.Handler(http.HandlerFunc(assetHandler.GetUploadURL)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/assets/", func(w http.ResponseWriter, r *http.Request) {
		authMiddleware.Handler(http.HandlerFunc(assetHandler.GetDownloadURL)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/api/ws/pages/", wsHandler.Handle)

	log.Printf("Server starting on port %s", cfg.ServerPort)
	log.Fatal(http.ListenAndServe(":"+cfg.ServerPort, mux))
}
