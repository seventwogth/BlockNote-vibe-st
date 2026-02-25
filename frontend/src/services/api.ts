import {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Workspace,
  CreateWorkspaceRequest,
  Page,
  PageWithContent,
  CreatePageRequest,
  UpdatePageRequest,
  GetUploadURLRequest,
  GetUploadURLResponse,
  GetDownloadURLResponse,
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

  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/workspaces');
  }

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkspacePages(workspaceId: string): Promise<Page[]> {
    return this.request<Page[]>(`/workspaces/${workspaceId}/pages`);
  }

  async getPage(pageId: string): Promise<PageWithContent> {
    const response = await this.request<PageWithContent & { content: string }>(`/pages/${pageId}`);
    return {
      ...response,
      content: new Uint8Array(
        atob(response.content as unknown as string).split('').map(c => c.charCodeAt(0))
      ),
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

  async updatePageContent(pageId: string, content: Uint8Array): Promise<void> {
    const base64 = btoa(String.fromCharCode(...content));
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
}

export const api = new ApiService();
