export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  parent_id?: string;
  owner_id: string;
  title: string;
  icon?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  children?: Page[];
}

export interface PageWithContent extends Page {
  content: Uint8Array;
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
}

export interface CreatePageRequest {
  workspace_id: string;
  parent_id?: string;
  title?: string;
  icon?: string;
}

export interface UpdatePageRequest {
  title?: string;
  icon?: string;
  is_archived?: boolean;
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
