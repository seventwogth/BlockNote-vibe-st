# BlockNote - Block-Based Note-Taking Platform

## 1. Project Overview

**Project Name:** BlockNote  
**Project Type:** Full-Stack Web Application  
**Core Functionality:** A block-based note-taking application with real-time collaboration, supporting both:
- **Text Mode** - Notion-like document editing with blocks
- **Board Mode** - FigJam/Miro-like whiteboard with shapes, drawings, and connectors

**Target Users:** Teams and individuals needing collaborative documentation and brainstorming.

---

## 2. Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18+ (TypeScript), Vite, Tailwind CSS |
| Editor Engine | Custom Block-based Editor with Yjs |
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

## 3. Page Types

### Page Type: "text"
- Notion-like document editing
- Block-based structure with proper cursor handling
- Supports: text, headings (H1/H2/H3), lists (bullet, numbered), todos, quotes, code, dividers, callouts
- Slash commands (/) for quick block insertion - see SlashCommandMenu.tsx
- Right-click context menu - see ContextMenu.tsx with options:
  - Delete, Duplicate
  - Turn into (change block type)
  - Copy/Paste
  - Color
- Floating toolbar on text selection (bold, italic, underline, strike, code, link)
- Keyboard navigation between blocks (Enter, Backspace, Arrow keys)
- Y.js based real-time collaboration

### Page Type: "board"
- FigJam/Miro-like whiteboard
- Infinite canvas with zoom/pan (mouse wheel, pinch)
- Bottom toolbar with tool buttons:
  - Select (V) - select and move elements
  - Hand (H) - pan canvas
  - Rectangle (R) - draw rectangles
  - Ellipse (O) - draw ellipses
  - Diamond (D) - draw diamonds
  - Arrow (A) - draw arrows/connectors
  - Text (T) - add text
  - Sticky Note (S) - add sticky notes
  - Pencil (P) - freehand drawing
  - Eraser (E) - delete elements
- Color picker (5 colors)
- Zoom controls in header
- Right-click context menu:
  - Copy, Paste, Delete
  - Bring to front / Send to back
- Keyboard shortcuts for tools
- Multi-select with Shift+click
- Delete with Delete/Backspace key
- Y.js based real-time collaboration

---

## 4. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table (multi-tenant)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(10),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Pages table - includes page_type (text/board)
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'Untitled',
    icon VARCHAR(10),
    page_type VARCHAR(20) DEFAULT 'text' NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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
| POST | /api/pages | Create new page (accepts page_type) |
| PUT | /api/pages/:id | Update page metadata |
| DELETE | /api/pages/:id | Delete page |
| POST | /api/pages/:id/update | Update Yjs content |
| GET | /api/assets/upload-url | Get S3 presigned upload URL |
| GET | /api/assets/:id/download-url | Get S3 presigned download URL |

### WebSocket

| Path | Description |
|------|-------------|
| WS /api/ws/pages/:id | Real-time Yjs sync for page |

---

## 6. Frontend Components

### File Structure

```
frontend/src/
├── components/
│   ├── Editor/
│   │   ├── BlockEditor.tsx      # Notion-like text editor
│   │   ├── BoardEditor.tsx     # FigJam-like board editor
│   │   ├── ContextMenu.tsx     # Right-click context menu
│   │   ├── SlashCommandMenu.tsx # Slash commands menu
│   │   └── FloatingToolbar.tsx # Text formatting toolbar
│   ├── Sidebar/
│   │   ├── Sidebar.tsx         # Main sidebar component
│   │   ├── PageTree.tsx       # Page tree navigation
│   │   └── CreatePageModal.tsx # Create page dialog
│   ├── Layout/
│   │   ├── Layout.tsx
│   │   └── Header.tsx
│   ├── SettingsModal.tsx
│   └── ShareModal.tsx
├── hooks/
│   ├── usePage.ts              # Page data management
│   ├── useWebSocket.ts         # Real-time sync
│   └── useS3Upload.ts          # File uploads
├── services/
│   └── api.ts                  # API client
├── types/
│   └── index.ts                # TypeScript types
└── App.tsx                     # Main app component
```

### Text Editor Features (BlockEditor.tsx)
- Block-based editing with proper cursor positioning
- Block types: text, heading1, heading2, heading3, bullet, numbered, todo, quote, code, divider, callout
- Keyboard navigation (Enter for new block, Backspace to delete empty, Arrow keys)
- Slash commands (/) to insert different block types
- Right-click context menu for block operations
- Floating toolbar for text formatting (bold, italic, underline, strike, code, link)
- Real-time collaboration via Y.js
- Auto-save with manual save button

### Board Editor Features (BoardEditor.tsx)
- Canvas-based rendering with HTML5 Canvas
- Tools: select, hand, rectangle, ellipse, diamond, arrow, text, sticky, pencil, eraser
- Color selection (5 preset colors)
- Zoom controls (+/- buttons, scroll wheel)
- Pan with middle mouse button or hand tool
- Multi-select with Shift+click
- Keyboard shortcuts for tools
- Right-click context menu
- Real-time collaboration via Y.js

---

## 7. Acceptance Criteria

1. ✅ Page type is set at creation and cannot be changed
2. ✅ Text mode works like Notion with blocks
3. ✅ Board mode works like FigJam with toolbar
4. ✅ Cursor stays in place while typing (no jumping) - fixed with proper contentEditable handling
5. ✅ Right-click context menu with options
6. ✅ Slash commands for quick block insertion
7. ✅ Full backend sync for all data
8. ✅ Real-time collaboration via WebSocket/Yjs
9. ✅ Workspace sharing with roles
10. ✅ Settings modal with export options

---

## 8. Implementation Notes

### Cursor Issue Fix
The original implementation used `dangerouslySetInnerHTML` and `onInput` with `innerHTML`, which caused cursor jumping. The fix uses:
- Individual contentEditable elements for each block
- Selection API for proper cursor positioning
- Block-based state management with unique IDs

### Board Canvas
Board editor uses HTML5 Canvas for rendering with:
- Device pixel ratio support for crisp rendering
- Grid background with pan/zoom
- Object-based state for elements
- Transform operations for multi-select

### Y.js Integration
Both editors use Y.js for real-time collaboration:
- Y.Doc for document state
- Y.Text for content storage
- WebSocket provider for sync
- Optimistic updates with conflict resolution
