import { useState, useCallback } from 'react';
import { api } from '../services/api';

interface UploadResult {
  url: string;
  assetId: string;
}

export function useS3Upload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    pageId: string,
    workspaceId: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const { upload_url, download_url, asset_id } = await api.getUploadURL({
        filename: file.name,
        mime_type: file.type,
        page_id: pageId,
        workspace_id: workspaceId,
      });

      const headers: Record<string, string> = {
        'Content-Type': file.type,
      };

      // Для presigned S3 URL нельзя добавлять лишние заголовки (например Authorization),
      // иначе подпись не совпадёт. Поэтому токен добавляем только для относительных URL (/api/...),
      // которые идут через наш backend.
      const isRelativeUrl = upload_url.startsWith('/');
      if (isRelativeUrl) {
        const token = api.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers,
      });

      return {
        url: download_url,
        assetId: asset_id,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    upload,
    uploading,
    error,
  };
}
