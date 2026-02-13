import { requestClient } from '#/api/request';

/**
 * Attachments API Namespace
 */
export namespace AttachmentsApi {
  /** Attachment */
  export interface Attachment {
    id: number;
    filename: string;
    original_filename: string;
    mime_type: string;
    size: number;
    human_size: string;
    is_image: boolean;
    is_video: boolean;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    url?: string | null;
    thumbnail_url?: string | null;
    created_at: string;
  }

  /** Upload Response */
  export interface UploadResponse {
    attachment: Attachment;
    message: string;
  }

  /** Download URL Response */
  export interface DownloadUrlResponse {
    url: string;
    expires_in: number;
    filename: string;
  }

  /** Bulk Delete Response */
  export interface BulkDeleteResponse {
    deleted_count: number;
    message: string;
  }
}

/**
 * Upload a file attachment
 * @param file - file to upload
 * @param attachableType - type of entity to attach to (e.g., 'messages', 'inbox_items')
 * @param attachableId - ID of entity to attach to
 * @param onProgress - optional progress callback
 */
export async function uploadAttachmentApi(
  file: File,
  attachableType: string,
  attachableId: number,
  onProgress?: (percent: number) => void,
): Promise<AttachmentsApi.UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachable_type', attachableType);
  formData.append('attachable_id', String(attachableId));

  return requestClient.post<AttachmentsApi.UploadResponse>(
    '/attachments/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    },
  );
}

/**
 * List attachments for an entity
 * @param attachableType - type of entity
 * @param attachableId - ID of entity
 */
export async function listAttachmentsApi(
  attachableType: string,
  attachableId: number,
) {
  return requestClient.get<AttachmentsApi.Attachment[]>('/attachments/', {
    params: { attachable_type: attachableType, attachable_id: attachableId },
  });
}

/**
 * Get a specific attachment
 * @param attachmentId - attachment ID
 */
export async function getAttachmentApi(attachmentId: number) {
  return requestClient.get<AttachmentsApi.Attachment>(`/attachments/${attachmentId}`);
}

/**
 * Get download URL for an attachment
 * @param attachmentId - attachment ID
 * @param expiresIn - URL expiry in seconds (default: 3600)
 */
export async function getDownloadUrlApi(
  attachmentId: number,
  expiresIn: number = 3600,
) {
  return requestClient.get<AttachmentsApi.DownloadUrlResponse>(
    `/attachments/${attachmentId}/download`,
    { params: { expires_in: expiresIn } },
  );
}

/**
 * Delete an attachment
 * @param attachmentId - attachment ID
 * @param hardDelete - permanently delete file from storage
 */
export async function deleteAttachmentApi(
  attachmentId: number,
  hardDelete: boolean = false,
) {
  return requestClient.delete(`/attachments/${attachmentId}`, {
    params: { hard_delete: hardDelete },
  });
}

/**
 * Bulk delete attachments
 * @param attachmentIds - IDs of attachments to delete
 * @param hardDelete - permanently delete files from storage
 */
export async function bulkDeleteAttachmentsApi(
  attachmentIds: number[],
  hardDelete: boolean = false,
) {
  return requestClient.post<AttachmentsApi.BulkDeleteResponse>(
    '/attachments/bulk-delete',
    attachmentIds,
    { params: { hard_delete: hardDelete } },
  );
}
