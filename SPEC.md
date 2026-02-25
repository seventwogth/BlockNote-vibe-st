# Notion Clone - Block-Based Note-Taking Platform

## 1. Project Overview

**Project Name:** BlockNote  
**Project Type:** Full-Stack Web Application  
**Core Functionality:** A block-based note-taking application with real-time collaboration, supporting nested pages, rich media, and CRDT-based synchronization.  
**Target Users:** Teams and individuals needing collaborative documentation.

---

## 2. Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18+ (TypeScript), Vite, Tailwind CSS |
| Editor Engine | BlockSuite SDK (MIT License) |
| Backend | Go 1.22+ (Clean Architecture) |
| Database | PostgreSQL (Primary) |
| Cache/Pub-Sub | Redis |
| Storage | S3-Compatible (MinIO dev, AWS R2 prod) |
| Real-time | Yjs via WebSockets |

### Architecture Pattern

Clean Architecture with dependency injection:
- `cmd/` - Application entry points
- `internal/entity/` - Domain entities
- `internal/usecase/` - Business logic
- `internal/repository/` - Data access
- `internal/handler/` - HTTP/WebSocket handlers
- `internal/service/` - External service integrations

---

## 3. UI/UX Specification

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (56px)                                              │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │           Main Content Area                 │
│   (240px)    │           (Editor + Blocks)                 │
│              │                                              │
│  - Workspaces│                                              │
│  - Pages     │                                              │
│  - Nested    │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Visual Design

**Color Palette:**
- Background: `#FFFFFF` (light), `#1A1A1A` (dark)
- Surface: `#F7F7F5` (light), `#2F2F2F` (dark)
- Primary: `#EB5757`
- Text Primary: `#37352F`
- Text Secondary: `#9B9A97`
- Border: `#E9E9E7`
- Hover: `#F1F1EE`

**Typography:**
- Font Family: `"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif`
- Heading 1: 30px, 600 weight
- Heading 2: 24px, 600 weight
- Body: 16px, 400 weight
- Caption: 14px, 400 weight

**Spacing System:**
- Base unit: 4px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Components

1. **Sidebar** - Collapsible, shows workspace tree with nested pages
2. **Page Title** - Editable with emoji picker
3. **Block Editor** - BlockSuite-based block editor
4. **Block Menu** - Drag handle, add block button
5. **Image Block** - Inline image with upload handling

---

## 4. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table (multi-tenant)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (workspace_id, user_id)
);

-- Pages table
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'Untitled',
    icon VARCHAR(10),
    isarchived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page contents (Yjs binary data)
CREATE TABLE page_contents (
    page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    content BYTEA NOT NULL DEFAULT '',
    version INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table (S3 metadata)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);
CREATE INDEX idx_assets_page ON assets(page_id);
CREATE INDEX idx_assets_workspace ON assets(workspace_id);
```

---

## 5. API Specification

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| GET | /api/workspaces | List user workspaces |
| POST | /api/workspaces | Create workspace |
| GET | /api/workspaces/:id/pages | Get workspace pages |
| GET | /api/pages/:id | Get page with content |
| POST | /api/pages | Create new page |
| PUT | /api/pages/:id | Update page metadata |
| DELETE | /api/pages/:id | Delete page |
| POST | /api/pages/:id/update | Update Yjs content |
| GET | /api/assets/upload-url | Get S3 presigned upload URL |
| GET | /api/assets/:id/download-url | Get S3 presigned download URL |

### WebSocket

| Path | Description |
|------|-------------|
| WS /api/ws/pages/:id | Real-time Yjs sync for page |

### Request/Response Types

```typescript
interface Page {
  id: string;
  workspaceId: string;
  parentId: string | null;
  ownerId: string;
  title: string;
  icon: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageWithContent extends Page {
  content: Uint8Array;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
  expiresIn: number;
}
```

---

## 6. Go Backend Implementation

### Directory Structure

```
cmd/
  api/
    main.go
internal/
  entity/
    user.go
    workspace.go
    page.go
    asset.go
  usecase/
    auth_usecase.go
    workspace_usecase.go
    page_usecase.go
    asset_usecase.go
  repository/
    user_repository.go
    workspace_repository.go
    page_repository.go
    asset_repository.go
  handler/
    auth_handler.go
    workspace_handler.go
    page_handler.go
    asset_handler.go
    websocket_handler.go
  service/
    s3_service.go
    jwt_service.go
  middleware/
    auth.go
config/
  config.go
```

### Key Implementation Details

1. **S3 Service** - Generate presigned URLs with configurable expiration (default 3600s)
2. **Page Service** - Atomic BYTEA updates with optimistic locking via version field
3. **WebSocket** - gorilla/websocket with Yjs sync protocol
4. **JWT Auth** - Stateless authentication for scalability

---

## 7. Frontend Implementation

### Directory Structure

```
src/
  components/
    Sidebar/
      Sidebar.tsx
      PageTree.tsx
    Editor/
      BlockEditor.tsx
      ImageBlock.tsx
    Layout/
      Header.tsx
      Layout.tsx
  hooks/
    usePage.ts
    useWebSocket.ts
    useS3Upload.ts
  services/
    api.ts
    websocket.ts
  types/
    index.ts
  App.tsx
  main.tsx
```

### BlockSuite Integration

1. Initialize BlockSuite editor in useEffect
2. Create Yjs document and WebSocket provider
3. Override default image upload to use S3 presigned URLs
4. Handle sync and awareness states

---

## 8. Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: blocknote
      POSTGRES_PASSWORD: blocknote
      POSTGRES_DB: blocknote
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  api:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://blocknote:blocknote@postgres:5432/blocknote?sslmode=disable
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: blocknote
      S3_ACCESS_KEY: minioadmin
      S3_SECRET_KEY: minioadmin
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres
      - redis
      - minio

volumes:
  postgres_data:
  minio_data:
```

---

## 9. Acceptance Criteria

1. ✅ PostgreSQL schema created with all required tables
2. ✅ Go backend implements all REST endpoints
3. ✅ WebSocket handler broadcasts Yjs updates
4. ✅ S3 presigned URL generation works
5. ✅ React frontend initializes BlockSuite editor
6. ✅ Real-time sync via WebSocket provider
7. ✅ Image upload uses presigned URLs
8. ✅ Sidebar displays nested page hierarchy
9. ✅ Docker compose starts all services
10. ✅ Clean Architecture with interfaces for DI
11. ✅ All code uses TypeScript interfaces and Go interfaces
