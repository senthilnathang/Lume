import { requestClient } from '#/api/request';

/**
 * Mention API Namespace for @mentions in messages
 */
export namespace MentionApi {
  /** User info for mention */
  export interface UserInfo {
    id: number;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }

  /** Mention suggestion for autocomplete */
  export interface MentionSuggestion {
    id: number;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }

  /** Mention in message */
  export interface MentionInMessage {
    user_id: number;
    mention_text: string | null;
    user: UserInfo | null;
  }
}

/**
 * Search users for @mention autocomplete
 */
export async function searchUsersForMentionApi(
  query: string,
  limit: number = 10,
) {
  return requestClient.get<MentionApi.MentionSuggestion[]>(
    '/users/search/mentions',
    {
      params: { q: query, limit },
    },
  );
}
