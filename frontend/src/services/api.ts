import {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Workspace,
  WorkspaceGroup,
  WorkspaceWithMembers,
  WorkspaceMember,
  CreateWorkspaceRequest,
  CreateWorkspaceGroupRequest,
  UpdateWorkspaceRequest,
  WorkspacesWithGroupsResponse,
  Page,
  PageWithContent,
  CreatePageRequest,
  UpdatePageRequest,
  MovePageRequest,
  SearchPageRequest,
  GetUploadURLRequest,
  GetUploadURLResponse,
  GetDownloadURLResponse,
  TrashItem,
  ShareResponse,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async logout() {
    this.setToken(null);
  }

  async getWorkspaces(): Promise<WorkspacesWithGroupsResponse> {
    return this.request<WorkspacesWithGroupsResponse>('/workspaces');
  }

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkspaceChildren(workspaceId: string): Promise<Workspace[]> {
    return this.request<Workspace[]>(`/workspaces/${workspaceId}/workspaces`);
  }

  async createWorkspaceGroup(data: CreateWorkspaceGroupRequest): Promise<WorkspaceGroup> {
    return this.request<WorkspaceGroup>('/workspace-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkspaceGroup(groupId: string, data: { name?: string; icon?: string }): Promise<WorkspaceGroup> {
    return this.request<WorkspaceGroup>(`/workspace-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspaceGroup(groupId: string): Promise<void> {
    return this.request<void>(`/workspace-groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${workspaceId}`);
  }

  async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    return this.request<void>(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  }

  async getWorkspacePages(workspaceId: string): Promise<Page[]> {
    return this.request<Page[]>(`/workspaces/${workspaceId}/pages`);
  }

  async getPage(pageId: string): Promise<PageWithContent> {
    const response = await this.request<PageWithContent & { content: string }>(`/pages/${pageId}`);
    let content = new Uint8Array(0);
    if (response.content && response.content.length > 0) {
      try {
        const binaryString = atob(response.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        content = bytes;
      } catch (err) {
        console.warn('Failed to decode content:', err);
      }
    }
    return {
      ...response,
      content,
    };
  }

  async createPage(data: CreatePageRequest): Promise<Page> {
    return this.request<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePage(pageId: string, data: UpdatePageRequest): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePage(pageId: string): Promise<void> {
    return this.request<void>(`/pages/${pageId}`, {
      method: 'DELETE',
    });
  }

  async archivePage(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}/archive`, {
      method: 'POST',
    });
  }

  async restorePage(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}/restore`, {
      method: 'POST',
    });
  }

  async movePage(pageId: string, data: MovePageRequest): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}/move`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleFavorite(pageId: string): Promise<Page> {
    return this.request<Page>(`/pages/${pageId}/favorite`, {
      method: 'POST',
    });
  }

  async getRecentPages(limit?: number): Promise<Page[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<Page[]>(`/pages/recent${query}`);
  }

  async getFavoritePages(workspaceId: string): Promise<Page[]> {
    return this.request<Page[]>(`/pages/favorites?workspace_id=${workspaceId}`);
  }

  async getArchivedPages(workspaceId: string): Promise<Page[]> {
    return this.request<Page[]>(`/pages/archived?workspace_id=${workspaceId}`);
  }

  async searchPages(req: SearchPageRequest): Promise<Page[]> {
    const params = new URLSearchParams();
    if (req.q) params.append('q', req.q);
    if (req.type) params.append('type', req.type);
    if (req.workspace_id) params.append('workspace_id', req.workspace_id);
    return this.request<Page[]>(`/pages/search?${params.toString()}`);
  }

  async updatePageContent(pageId: string, content: Uint8Array): Promise<void> {
    let binary = '';
    const bytes = new Uint8Array(content);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return this.request<void>(`/pages/${pageId}/update`, {
      method: 'POST',
      body: JSON.stringify({ content: base64 }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getUploadURL(data: GetUploadURLRequest): Promise<GetUploadURLResponse> {
    return this.request<GetUploadURLResponse>('/assets/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDownloadURL(assetId: string): Promise<GetDownloadURLResponse> {
    return this.request<GetDownloadURLResponse>(`/assets/${assetId}/download-url`);
  }

  async getWorkspaceWithMembers(workspaceId: string): Promise<WorkspaceWithMembers> {
    return this.request<WorkspaceWithMembers>(`/workspaces/${workspaceId}/members`);
  }

  async inviteUser(workspaceId: string, email: string, role: string): Promise<WorkspaceMember> {
    return this.request<WorkspaceMember>(`/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    return this.request<void>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: string): Promise<void> {
    return this.request<void>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async getTrash(workspaceId: string): Promise<TrashItem[]> {
    return this.request<TrashItem[]>(`/trash?workspace_id=${workspaceId}`);
  }

  async restoreTrashItem(trashId: string): Promise<void> {
    return this.request<void>(`/trash/${trashId}/restore`, {
      method: 'POST',
    });
  }

  async deleteTrashItem(trashId: string): Promise<void> {
    return this.request<void>(`/trash/${trashId}`, {
      method: 'DELETE',
    });
  }

  async emptyTrash(workspaceId: string): Promise<void> {
    return this.request<void>(`/trash/empty?workspace_id=${workspaceId}`, {
      method: 'DELETE',
    });
  }

  async sharePage(pageId: string, accessLevel: string, expiresAt?: string): Promise<ShareResponse> {
    return this.request<ShareResponse>(`/pages/${pageId}/share`, {
      method: 'POST',
      body: JSON.stringify({ access_level: accessLevel, expires_at: expiresAt }),
    });
  }

  async getPageShares(pageId: string): Promise<ShareResponse[]> {
    return this.request<ShareResponse[]>(`/pages/${pageId}/shares`);
  }

  async revokeShare(token: string): Promise<void> {
    return this.request<void>(`/share/${token}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
