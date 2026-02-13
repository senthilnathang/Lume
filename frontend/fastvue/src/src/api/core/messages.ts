import { requestClient } from '#/api/request';

/**
 * Messages API Namespace
 */
export namespace MessagesApi {
  /** User info for messages */
  export interface UserInfo {
    id: number;
    full_name: string;
    avatar_url: string | null;
  }

  /** Read receipt */
  export interface ReadReceipt {
    message_id: number;
    user_id: number;
    read_at: string;
    user: UserInfo | null;
  }

  /** Read receipt list response */
  export interface ReadReceiptListResponse {
    message_id: number;
    read_count: number;
    receipts: ReadReceipt[];
  }

  /** Read status response */
  export interface ReadStatusResponse {
    message_id: number;
    read_count: number;
    current_user_read: boolean;
    is_own_message: boolean;
  }

  /** Bulk read response */
  export interface BulkReadResponse {
    read_count: number;
    message_ids: number[];
  }
}

/**
 * Mark a message as read
 * @param messageId - Message ID to mark as read
 */
export async function markMessageAsReadApi(messageId: number) {
  return requestClient.post<MessagesApi.ReadReceipt>(
    `/messages/${messageId}/read`,
  );
}

/**
 * Get read receipts for a message
 * @param messageId - Message ID
 */
export async function getMessageReadReceiptsApi(messageId: number) {
  return requestClient.get<MessagesApi.ReadReceiptListResponse>(
    `/messages/${messageId}/read-receipts`,
  );
}

/**
 * Get read status for a message (quick check)
 * @param messageId - Message ID
 */
export async function getMessageReadStatusApi(messageId: number) {
  return requestClient.get<MessagesApi.ReadStatusResponse>(
    `/messages/${messageId}/read-status`,
  );
}

/**
 * Mark multiple messages as read
 * @param messageIds - Array of message IDs
 */
export async function bulkMarkMessagesAsReadApi(messageIds: number[]) {
  return requestClient.post<MessagesApi.BulkReadResponse>(
    '/messages/bulk-read',
    { message_ids: messageIds },
  );
}
