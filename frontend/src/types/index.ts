export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type WorkspaceType = 'workspace' | 'group';

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  owner_id: string;
  parent_id?: string;
  workspace_group_id?: string;
  type: WorkspaceType;
  position: number;
  settings?: WorkspaceSettings;
  created_at: string;
  updated_at: string;
  children?: Workspace[];
  workspaces?: Workspace[];
}

export interface WorkspaceGroup {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
  position: number;
  created_at: string;
  updated_at: string;
  workspaces?: Workspace[];
  groups?: WorkspaceGroup[];
}

export interface WorkspaceSettings {
  allow_public_sharing?: boolean;
  default_page_type?: string;
  enable_comments?: boolean;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  created_at: string;
  user?: User;
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
}

export interface Page {
  id: string;
  workspace_id: string;
  parent_id?: string;
  owner_id: string;
  title: string;
  icon?: string;
  page_type: 'text' | 'folder';
  content_text?: string;
  is_archived: boolean;
  is_favorite?: boolean;
  last_accessed?: string;
  position?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  children?: Page[];
}

export interface PageWithContent extends Page {
  content: Uint8Array;
}

export interface TrashItem {
  id: string;
  item_type: 'page' | 'workspace' | 'asset';
  item_id: string;
  workspace_id: string;
  deleted_by?: string;
  original_data?: Record<string, unknown>;
  deleted_at: string;
  expires_at: string;
}

export interface SharedPage {
  id: string;
  page_id: string;
  token: string;
  access_level: 'view' | 'edit' | 'comment';
  created_by?: string;
  expires_at?: string;
  created_at: string;
}

export interface ShareResponse {
  token: string;
  url: string;
  access_level: string;
  expires_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  icon?: string;
  description?: string;
  parent_id?: string;
  workspace_group_id?: string;
  type?: WorkspaceType;
}

export interface CreateWorkspaceGroupRequest {
  name: string;
  icon?: string;
}

export interface WorkspacesWithGroupsResponse {
  groups: WorkspaceGroup[];
  workspaces: Workspace[];
}

export interface UpdateWorkspaceRequest {
  name?: string;
  icon?: string;
  description?: string;
  parent_id?: string;
  type?: WorkspaceType;
}

export interface CreatePageRequest {
  workspace_id: string;
  parent_id?: string;
  title?: string;
  icon?: string;
  page_type: 'text' | 'folder';
}

export interface UpdatePageRequest {
  title?: string;
  icon?: string;
  is_archived?: boolean;
  is_favorite?: boolean;
  parent_id?: string;
  position?: number;
  tags?: string[];
}

export interface MovePageRequest {
  parent_id?: string;
  position: number;
}

export interface SearchPageRequest {
  q: string;
  type?: string;
  workspace_id?: string;
}

export interface GetUploadURLRequest {
  filename: string;
  mime_type: string;
  page_id: string;
  workspace_id: string;
}

export interface GetUploadURLResponse {
  upload_url: string;
  download_url: string;
  key: string;
  expires_in: number;
  asset_id: string;
}

export interface GetDownloadURLResponse {
  download_url: string;
  expires_in: number;
}
