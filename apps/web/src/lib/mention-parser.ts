/**
 * Mention Parser Utility
 * Parses @mentions from text content in feed posts and comments
 */

import { pool } from '@/lib/db/config'

export interface ParsedMention {
  mentionText: string // e.g., "@john.doe" or "@John Doe"
  employeeId: string | null // e.g., "AM-0001" (null if user not found)
  userName: string | null // e.g., "John Doe"
  startIndex: number
  endIndex: number
}

/**
 * Parse @mentions from text content
 * Supports both @username and @"Full Name" formats
 * 
 * Examples:
 * - "@john.doe" → matches user with name "john.doe" or employeeId "john.doe"
 * - "@John Doe" → matches user with name "John Doe"
 * - "@AM-0001" → matches user with employeeId "AM-0001"
 * 
 * @param text - The text content to parse
 * @returns Array of parsed mentions with user information
 */
export async function parseMentions(text: string): Promise<ParsedMention[]> {
  if (!text || typeof text !== 'string') {
    return []
  }

  const mentions: ParsedMention[] = []
  
  // Regex to match @mentions:
  // - @word (alphanumeric, dots, hyphens, underscores)
  // - @"Full Name" (quoted names with spaces)
  const mentionRegex = /@([\w.-]+|"[^"]+")/ g

  let match
  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0] // e.g., "@john.doe" or "@"John Doe""
    const mentionText = match[1] // e.g., "john.doe" or ""John Doe""
    const startIndex = match.index
    const endIndex = match.index + fullMatch.length

    // Remove quotes if present
    const cleanMentionText = mentionText.replace(/^"|"$/g, '')

    // Look up user in database
    // Try to match by:
    // 1. employee_id (exact match, case-insensitive)
    // 2. name (exact match, case-insensitive)
    // 3. email username (before @, case-insensitive)
    
    try {
      const result = await pool.query(
        `SELECT employee_id, name, email 
         FROM users 
         WHERE deleted_at IS NULL 
         AND (
           LOWER(employee_id) = LOWER($1)
           OR LOWER(name) = LOWER($1)
           OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER($1)
         )
         LIMIT 1`,
        [cleanMentionText]
      )

      if (result.rows.length > 0) {
        const user = result.rows[0]
        mentions.push({
          mentionText: fullMatch,
          employeeId: user.employee_id,
          userName: user.name,
          startIndex,
          endIndex
        })
      } else {
        // User not found, but still record the mention attempt
        mentions.push({
          mentionText: fullMatch,
          employeeId: null,
          userName: null,
          startIndex,
          endIndex
        })
      }
    } catch (error) {
      console.error('[parseMentions] Error looking up user:', error)
      // On error, record mention without user info
      mentions.push({
        mentionText: fullMatch,
        employeeId: null,
        userName: null,
        startIndex,
        endIndex
      })
    }
  }

  return mentions
}

/**
 * Store mentions in the database
 * 
 * @param mentions - Array of parsed mentions
 * @param postId - The post ID (if mention is in a post)
 * @param commentId - The comment ID (if mention is in a comment)
 * @param mentionedByUserId - The user ID who created the mention
 */
export async function storeMentions(
  mentions: ParsedMention[],
  postId: string | null,
  commentId: string | null,
  mentionedByUserId: string
): Promise<void> {
  if (mentions.length === 0) {
    return
  }

  // Filter out mentions where user was not found
  const validMentions = mentions.filter(m => m.employeeId !== null)

  if (validMentions.length === 0) {
    return
  }

  try {
    for (const mention of validMentions) {
      const mentionId = `mention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await pool.query(
        `INSERT INTO feed_mentions (
          mention_id, post_id, comment_id, mentioned_user_id, 
          mentioned_by_user_id, mention_text, is_read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          mentionId,
          postId,
          commentId,
          mention.employeeId,
          mentionedByUserId,
          mention.mentionText,
          false
        ]
      )
    }

    console.log(`✅ [storeMentions] Stored ${validMentions.length} mentions`)
  } catch (error) {
    console.error('[storeMentions] Error storing mentions:', error)
    throw error
  }
}

