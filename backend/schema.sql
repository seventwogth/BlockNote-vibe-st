-- BlockNote Database Schema
-- PostgreSQL 16+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    type VARCHAR(20) DEFAULT 'workspace' NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_parent ON workspaces(parent_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- Pages
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'Untitled',
    icon VARCHAR(10),
    page_type VARCHAR(20) DEFAULT 'text' NOT NULL,
    content_text TEXT DEFAULT '',
    is_archived BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    position INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_owner ON pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_archived ON pages(is_archived);
CREATE INDEX IF NOT EXISTS idx_pages_favorite ON pages(is_favorite);
CREATE INDEX IF NOT EXISTS idx_pages_accessed ON pages(last_accessed);
CREATE INDEX IF NOT EXISTS idx_pages_title_trgm ON pages USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pages_position ON pages(workspace_id, parent_id, position);

-- Page contents
CREATE TABLE IF NOT EXISTS page_contents (
    page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    content BYTEA NOT NULL DEFAULT '',
    version INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
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

CREATE INDEX IF NOT EXISTS idx_assets_page ON assets(page_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_contents_updated_at BEFORE UPDATE ON page_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
