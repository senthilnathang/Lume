/**
 * Mention Renderer Utility
 *
 * Renders @mentions in message body with highlighting and links.
 */

/** Mention info in message */
export interface MentionInMessage {
  user_id: number;
  mention_text: string | null;
  user: {
    id: number;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Render mentions in message body
 *
 * Replaces @username patterns with highlighted spans.
 * If mentions array is provided, uses actual user names.
 *
 * @param body - Message body text
 * @param mentions - Optional array of mentions with user info
 * @returns HTML string with highlighted mentions
 */
export function renderMentions(
  body: string,
  mentions?: MentionInMessage[],
): string {
  if (!body) return '';

  // Create a map of mention text to user info
  const mentionMap = new Map<string, MentionInMessage>();
  if (mentions) {
    for (const mention of mentions) {
      if (mention.mention_text) {
        mentionMap.set(mention.mention_text.toLowerCase(), mention);
      }
    }
  }

  // Match @mentions pattern
  const mentionPattern = /@([a-zA-Z0-9._]+)/g;

  // Process the body
  let result = '';
  let lastIndex = 0;

  for (const match of body.matchAll(mentionPattern)) {
    const mentionText = match[0]!;
    const username = match[1]!;
    const startIndex = match.index!;

    // Add text before the mention
    result += escapeHtml(body.slice(lastIndex, startIndex));

    // Check if we have user info for this mention
    const mentionInfo = mentionMap.get(mentionText.toLowerCase());

    if (mentionInfo?.user) {
      // Render with user info
      const displayName = mentionInfo.user.full_name || username!;
      result += `<span class="mention" data-user-id="${mentionInfo.user.id}" title="${escapeHtml(username!)}">@${escapeHtml(displayName)}</span>`;
    } else {
      // Render without user info (just highlight)
      result += `<span class="mention">@${escapeHtml(username)}</span>`;
    }

    lastIndex = startIndex + mentionText.length;
  }

  // Add remaining text
  result += escapeHtml(body.slice(lastIndex));

  return result;
}

/**
 * Render message body with mentions and basic formatting
 *
 * Applies:
 * - Mention highlighting
 * - Newline to <br> conversion
 * - URL auto-linking
 *
 * @param body - Message body text
 * @param mentions - Optional array of mentions
 * @returns HTML string
 */
export function renderMessageBody(
  body: string,
  mentions?: MentionInMessage[],
): string {
  if (!body) return '';

  // First render mentions
  let html = renderMentions(body, mentions);

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');

  // Auto-link URLs (simple pattern)
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  html = html.replace(
    urlPattern,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return html;
}

/**
 * Extract usernames from a message body
 *
 * @param body - Message body text
 * @returns Array of mentioned usernames (without @)
 */
export function extractMentions(body: string): string[] {
  if (!body) return [];

  const mentionPattern = /@([a-zA-Z0-9._]+)/g;
  const usernames: string[] = [];

  for (const match of body.matchAll(mentionPattern)) {
    const username = match[1]!;
    if (!usernames.includes(username)) {
      usernames.push(username);
    }
  }

  return usernames;
}

/**
 * Insert a mention at cursor position in text
 *
 * @param text - Current text
 * @param cursorPosition - Current cursor position
 * @param username - Username to insert
 * @returns Object with new text and new cursor position
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  username: string,
): { text: string; cursorPosition: number } {
  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);

  // Check if there's an incomplete @mention before cursor
  const incompleteMatch = before.match(/@([a-zA-Z0-9._]*)$/);

  if (incompleteMatch) {
    // Replace the incomplete mention
    const newBefore = before.slice(0, before.length - incompleteMatch[0].length);
    const mention = `@${username} `;
    return {
      text: newBefore + mention + after,
      cursorPosition: newBefore.length + mention.length,
    };
  }

  // Just insert the mention
  const mention = `@${username} `;
  return {
    text: before + mention + after,
    cursorPosition: cursorPosition + mention.length,
  };
}

/**
 * CSS styles for mentions (to be included in global styles)
 */
export const mentionStyles = `
  .mention {
    color: var(--ant-color-primary);
    background: var(--ant-color-primary-bg);
    padding: 0 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .mention:hover {
    background: var(--ant-color-primary-bg-hover);
    text-decoration: underline;
  }
`;
