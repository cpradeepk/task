# Create a Social Feed Feature for JSR Task Management System

## Overview
Implement a comprehensive social media-style feed feature with a new "Feed" menu item in the horizontal navigation bar. The feed will support multiple content types, threaded discussions, reactions, view tracking, and both public and private content organization.

---

## 1. Navigation & Routing

**[XX] Task**: Add "Feed" menu item to horizontal navigation bar
- Insert menu item in the horizontal navbar (between existing items, maintain consistent styling)
- Route: `/feed`
- Page location: `apps/web/src/app/feed/page.tsx`
- Use existing icon library (Lucide React) for consistency

---

## 2. Page Layout (3-Column Responsive Design)

### Left Sidebar: Topics List
**Purpose**: Display filterable topics for the feed

**System-Managed Topics** (initial examples):
1. Latest Technologies
2. Amtariksha Updates
3. AI
4. Robotics
5. Software Development
6. Ideas

**Special User-Specific Topics** (see Section 5 for details):
- **Personal Notes**: Private topic for logging personal learnings, thoughts, and best practices (only visible to owner)
- **Saved Posts**: Private collection of saved/bookmarked posts from other topics (only visible to owner)

**Behavior**:
- Clicking a topic filters the center feed to show only posts tagged with that topic
- When no topic is selected, show all posts the user has access to (sorted by newest first)
- Visually highlight the currently selected topic
- Display post count badge next to each topic name
- Personal Notes and Saved Posts topics should be visually distinguished (e.g., different icon, separator, or "My Topics" section header)

**Admin Management Page**:
- Create admin page at `/admin/feed-topics` (accessible only to users with `is_system_admin = 1`)
- Admin capabilities:
  - Add new public topics (topic name, optional description, optional emoji/icon)
  - Edit existing topics
  - Soft delete topics (with confirmation dialog: "Are you sure? This will hide the topic and all its posts.")
  - Reorder topics using drag-and-drop or up/down arrow buttons
- Store topics in new database table: `feed_topics`

**Database Schema for Topics**:
```sql
CREATE TABLE feed_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon class name
  display_order INT DEFAULT 0,
  is_personal BOOLEAN DEFAULT false, -- true for Personal Notes topics
  is_saved BOOLEAN DEFAULT false, -- true for Saved Posts topics
  owner_user_id VARCHAR(50), -- NULL for public topics, user_id for personal/saved topics
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  INDEX idx_owner (owner_user_id),
  INDEX idx_deleted (deleted_at)
);
```

### Center: Feed Posts

**Search & Filter Bar** (sticky at top):
- **Search input**: Full-text search across post descriptions and tags (placeholder: "Search posts...")
- **Topic filter dropdown**: Filter by specific topic (syncs with left sidebar selection)
- **Clear filters button**: Reset all filters and show all posts
- **Sort dropdown** (optional): "Newest first" (default), "Most reactions", "Most comments"

**Post Display**:
- Default sort: Reverse chronological order by `approved_at` (for approved posts) or `created_at` (for auto-published posts)
- When topic is selected: Show only posts tagged with that topic, maintain sort order
- Each post card displays:
  - **Header**: User avatar (circular, 40px), username (bold), timestamp (relative: "2h ago", "3d ago", "1w ago"), topic tags as colored badges (e.g., `#AI #Robotics`)
  - **Content**: Rendered based on content type (see Content Types below)
  - **Description**: Optional text description below content (support markdown formatting)
  - **Footer**: Reaction bar, comment count, "Seen by" indicator, action menu (3-dot menu for edit/delete/save)

**Pagination/Infinite Scroll**:
- Initial load: 10 posts
- Infinite scroll: Load next 10 posts when user scrolls within 200px of bottom
- Use cursor-based pagination (cursor = last post's `approved_at` or `created_at`)
- Show loading spinner while fetching more posts
- Show "No more posts" message when all posts are loaded

**Content Types** (auto-detect based on input):

1. **Text Post**: 
   - Plain text with optional markdown formatting
   - Display in card with white/light background
   - Support line breaks and basic formatting (bold, italic, lists)

2. **Link/URL**:
   - Auto-detect URLs in input
   - Fetch Open Graph metadata (title, description, image) from URL
   - Display as preview card with thumbnail, title, description, and domain
   - Click opens link in new tab
   - Fallback: If OG fetch fails, show URL as clickable link

3. **PDF**:
   - Auto-detect `.pdf` file extension or PDF MIME type
   - Display PDF viewer within post card using `react-pdf` or `@react-pdf-viewer/core`
   - Show first page as preview with "View Full PDF" button
   - Click expands to full-screen PDF viewer with page navigation

4. **YouTube Video**:
   - Auto-detect YouTube URLs (youtube.com/watch?v=, youtu.be/)
   - Extract video ID from URL
   - Embed YouTube iframe player (responsive 16:9 aspect ratio)
   - Show video title and channel name if available from YouTube API

5. **Image**:
   - Auto-detect image file extensions (.jpg, .jpeg, .png, .gif, .webp) or image MIME types
   - Display image with max-width 100%, maintain aspect ratio
   - Click to open lightbox/modal with full-size image
   - Support image zoom and pan in lightbox
   - Lazy load images using Intersection Observer

6. **Short Video**:
   - Auto-detect video file extensions (.mp4, .webm, .mov) or video MIME types
   - Display HTML5 video player with controls
   - Max duration: 2 minutes (validate on upload, show error if exceeded)
   - Lazy load videos (load only when in viewport)

**Post Interactions**:

1. **Reactions** (emoji reactions):
   - Available emojis: 🧡 ☺️ 😁 😂 🫶🏻 😒 🤦🏻‍♀️ 🕺 💃🏻 🤣 😎 🥳 🤯 😡 🥺 🙏🏻 😭 💯
   - Display reaction bar below post content
   - Show count for each emoji that has been used (e.g., "🧡 5  😂 3")
   - Click emoji to toggle reaction (add if not reacted, remove if already reacted)
   - Hover over emoji count to see tooltip with list of users who reacted (e.g., "John, Sarah, and 3 others")
   - Click emoji count to open modal with full list of reactors (avatar + username)
   - Store in `feed_reactions` table

2. **Comments** (threaded discussion):
   - **Primary comments**: Top-level comments displayed directly below post
   - **Replies**: Nested replies indented under parent comment (Instagram-style threading, max 2 levels deep)
   - **Comment UI**:
     - Avatar (24px), username (bold), timestamp (relative), comment text
     - "Reply" button on each comment to create nested reply
     - "Edit" and "Delete" buttons visible only to comment author
     - Edit mode: Replace comment text with textarea, "Save" and "Cancel" buttons
     - Delete: Soft delete with confirmation dialog
   - **Comment input**:
     - Textarea at bottom of post for new top-level comment
     - Textarea appears below parent comment when "Reply" is clicked
     - "Post Comment" button (disabled if textarea is empty)
     - Auto-focus textarea when "Reply" is clicked
   - **Threading**:
     - Top-level comments: `parent_comment_id = NULL`
     - Replies: `parent_comment_id = <parent_comment_id>`
     - Limit nesting to 2 levels (replies to replies are not allowed, or flatten to same level)
   - Store in `feed_comments` table

3. **"Seen by" Feature** (view tracking):
   - Track which users have viewed each post
   - Display small eye icon with count below post (e.g., "👁️ 12")
   - **Visibility**: Only show to users with roles: `top_management`, `management`, `amtarikshian`, `employee`, `admin`
   - Click eye icon to open modal/dropdown showing list of viewers:
     - Avatar (32px), username, view timestamp (relative: "Viewed 2h ago")
     - Sort by most recent view first
   - Auto-track view when post enters viewport for >2 seconds (use Intersection Observer)
   - Store in `feed_views` table with `post_id`, `user_id`, `viewed_at`
   - Ensure one view per user per post (UNIQUE constraint)

4. **Save to Saved Posts**:
   - Add "Save" button (bookmark icon) in post action menu (3-dot menu or visible button)
   - Click to save post reference to user's private "Saved Posts" topic
   - Button state changes to "Saved" (filled bookmark icon) if already saved
   - Click again to unsave (remove from Saved Posts)
   - Implementation: Create entry in `feed_post_topics` linking post to user's Saved Posts topic
   - Saved posts appear in user's Saved Posts topic feed (same post, not a copy)

### Right Sidebar (Future Expansion - Not in MVP):
- Trending topics (most active in last 24 hours)
- Recent activity (recent comments/reactions on user's posts)
- Suggested users to follow

---

## 3. Post Creation

**Who Can Post**:
- Users with roles: `admin`, `top_management`, `management`, `amtarikshian`, `employee` (check `users.role` column)
  - Posts from these users: **Auto-published** (`status = 'published'`, `approved_at = created_at`)
- Users with other roles:
  - Posts go to **pending approval** state (`status = 'pending'`)
  - Not visible in feed until approved

**Post Approval Workflow** (for non-privileged users):
- Pending posts: `status = 'pending'`, not shown in public feed
- Management users see notification badge on "Feed" menu item (count of pending posts)
- Create approval page at `/feed/pending` (accessible to `management`, `top_management`, `admin`)
- Approval page shows list of pending posts with:
  - Post preview (content, description, topics)
  - Author info (avatar, username, role)
  - "Approve" button (green) and "Reject" button (red)
- **Approve action**:
  - Set `status = 'approved'`
  - Set `approved_at = NOW()`
  - Set `approved_by = <current_user_id>`
  - Use `approved_at` as the post timestamp for sorting in feed (not `created_at`)
- **Reject action**:
  - Set `status = 'rejected'`
  - Optionally: Send notification to post author (future enhancement)

**Post Creation Form/Modal**:
- **Trigger**: "Create Post" button (prominent, top-right of feed page)
- **Form fields**:
  1. **Topic selection**: Multi-select dropdown (required, can select multiple topics)
     - Show all public topics + user's Personal Notes topic
     - Default: No selection (user must choose)
  2. **Content input**: Single textarea/input field (required)
     - Placeholder: "Share a link, upload a file, or write something..."
     - **Auto-detect content type** based on input:
       - If input starts with `http://` or `https://`: Detect as Link
       - If input contains `youtube.com` or `youtu.be`: Detect as YouTube
       - If file is uploaded: Detect based on MIME type and extension
       - Otherwise: Treat as Text post
  3. **File upload** (optional):
     - Drag-and-drop zone or "Upload File" button
     - Supported types: Images (JPG, PNG, GIF, WebP), Videos (MP4, WebM, max 2 min), PDFs
     - Show file preview after upload
     - Validate file size (max 50MB for videos, 10MB for images, 20MB for PDFs)
     - Upload to S3 immediately on selection, store S3 URL
  4. **Description** (optional): Textarea for additional context
     - Placeholder: "Add a description (optional)..."
     - Support markdown formatting (bold, italic, lists, links)
  5. **Submit button**: 
     - Text: "Post" (for auto-publish users) or "Submit for Approval" (for pending users)
     - Disabled if topic not selected or content is empty
- **Validation**:
  - At least one topic must be selected
  - Content input or file upload is required (cannot be both empty)
  - Video duration must be ≤2 minutes
  - File size limits enforced
- **Error handling**:
  - Show inline error messages for validation failures
  - Show toast notification on successful post creation
  - Show error toast if S3 upload fails

**File Storage**:
- Use existing AWS S3 bucket: `amtariksha`, region: `ap-south-1`
- Store files in folder: `feed-uploads/`
- Filename format: `{timestamp}-{uuid}-{original_filename}` (prevent collisions)
- Set appropriate Content-Type headers for each file type
- Enable public read access for uploaded files

**Mobile App Integration** (Future - Phase 2):
- When content is shared to the app from external sources (e.g., YouTube, browser):
  - Auto-open post creation form with pre-filled content URL
  - Auto-detect content type
  - User selects topics and adds description
  - Submit to create post
- Similar to WhatsApp share functionality

---

## 4. Database Schema

**[XX] Database tables created successfully**

### Table: `feed_topics`
```sql
CREATE TABLE feed_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or Lucide icon name
  display_order INT DEFAULT 0,
  is_personal BOOLEAN DEFAULT false, -- true for Personal Notes
  is_saved BOOLEAN DEFAULT false, -- true for Saved Posts
  owner_user_id VARCHAR(50), -- NULL for public, user_id for personal/saved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  INDEX idx_owner (owner_user_id),
  INDEX idx_deleted (deleted_at),
  INDEX idx_display_order (display_order)
);
```

### Table: `feed_posts`
```sql
CREATE TABLE feed_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'POST-{timestamp}-{random}'
  user_id VARCHAR(50) NOT NULL, -- references users.user_id
  content_type VARCHAR(20) NOT NULL, -- 'text', 'link', 'pdf', 'youtube', 'image', 'video'
  content_url TEXT, -- S3 URL for uploaded files, or external URL for links/YouTube
  content_text TEXT, -- for text posts
  description TEXT, -- optional post description (supports markdown)
  status VARCHAR(20) DEFAULT 'published', -- 'published', 'pending', 'rejected'
  approved_by VARCHAR(50), -- user_id of approver (NULL if auto-published)
  approved_at TIMESTAMP, -- approval timestamp (used for sorting in feed)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_approved_at (approved_at),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted (deleted_at)
);
```

### Table: `feed_post_topics` (many-to-many relationship)
```sql
CREATE TABLE feed_post_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  topic_id INT NOT NULL, -- references feed_topics.id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_post_topic (post_id, topic_id),
  INDEX idx_post (post_id),
  INDEX idx_topic (topic_id)
);
```

### Table: `feed_reactions`
```sql
CREATE TABLE feed_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.user_id
  emoji VARCHAR(10) NOT NULL, -- the emoji character (UTF-8)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_emoji_reaction (post_id, user_id, emoji),
  INDEX idx_post (post_id),
  INDEX idx_user (user_id)
);
```

### Table: `feed_comments`
```sql
CREATE TABLE feed_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id VARCHAR(100) UNIQUE NOT NULL, -- format: 'CMT-{timestamp}-{random}'
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.user_id
  parent_comment_id VARCHAR(100), -- references feed_comments.comment_id (NULL for top-level)
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(50) NULL,
  INDEX idx_post (post_id),
  INDEX idx_parent (parent_comment_id),
  INDEX idx_user (user_id),
  INDEX idx_deleted (deleted_at)
);
```

### Table: `feed_views`
```sql
CREATE TABLE feed_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL, -- references feed_posts.post_id
  user_id VARCHAR(50) NOT NULL, -- references users.user_id
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_view (post_id, user_id),
  INDEX idx_post (post_id),
  INDEX idx_user (user_id),
  INDEX idx_viewed_at (viewed_at)
);
```

---

## 5. Personal Notes and Saved Posts Feature

### Personal Notes
**Purpose**: Private topic for each user to log personal learnings, thoughts, and best practices for self-reference only.

**Implementation**:
- Each user automatically gets a "Personal Notes" topic created on first login (or lazily when first accessed)
- Topic properties:
  - `topic_name`: `"Personal Notes - {user_id}"` (internal, not shown in UI)
  - `is_personal`: `true`
  - `owner_user_id`: `{user_id}`
  - Display name in UI: "Personal Notes" (without user_id suffix)
- **Privacy**: Strictly private - only owner can see posts in their Personal Notes
  - Enforce in all database queries: `WHERE topic_id = <user_personal_notes_topic_id> AND owner_user_id = <current_user_id>`
  - Never show in public feed or other users' feeds
- **Features**:
  - User can create posts directly in Personal Notes (same post creation form, but Personal Notes topic is pre-selected and locked)
  - Posts can be text, links, files, etc. (all content types supported)
  - User can forward/copy posts from Personal Notes to other public topics (requires approval if user doesn't have auto-publish permission)
  - Search and filter work within Personal Notes topic
  - Sorted by newest first (by `created_at` or `approved_at`)

### Saved Posts
**Purpose**: Private collection of bookmarked/saved posts from other topics for future reference (read later, watch later).

**Implementation**:
- Each user automatically gets a "Saved Posts" topic created on first login (or lazily when first accessed)
- Topic properties:
  - `topic_name`: `"Saved Posts - {user_id}"` (internal, not shown in UI)
  - `is_saved`: `true`
  - `owner_user_id`: `{user_id}`
  - Display name in UI: "Saved Posts" (without user_id suffix)
- **Privacy**: Strictly private - only owner can see their saved posts
  - Enforce in all database queries: `WHERE topic_id = <user_saved_posts_topic_id> AND owner_user_id = <current_user_id>`
- **Features**:
  - User clicks "Save" button on any post → creates entry in `feed_post_topics` linking post to user's Saved Posts topic
  - Saved posts appear in Saved Posts feed (same post object, not a duplicate)
  - User can unsave posts (remove from Saved Posts topic)
  - Search and filter work within Saved Posts topic
  - Sorted by save date (most recently saved first) - use `feed_post_topics.created_at` for sort order

**Database Changes**:
- Add columns to `feed_topics` table (already included in schema above):
  - `is_personal BOOLEAN DEFAULT false`
  - `is_saved BOOLEAN DEFAULT false`
  - `owner_user_id VARCHAR(50)` (NULL for public topics, user_id for personal/saved topics)

**Auto-creation Logic**:
- On user first login or first access to feed:
  - Check if user has Personal Notes topic: `SELECT id FROM feed_topics WHERE is_personal = true AND owner_user_id = <user_id>`
  - If not exists, create: `INSERT INTO feed_topics (topic_name, is_personal, owner_user_id, created_by) VALUES ('Personal Notes - {user_id}', true, '{user_id}', '{user_id}')`
  - Check if user has Saved Posts topic: `SELECT id FROM feed_topics WHERE is_saved = true AND owner_user_id = <user_id>`
  - If not exists, create: `INSERT INTO feed_topics (topic_name, is_saved, owner_user_id, created_by) VALUES ('Saved Posts - {user_id}', true, '{user_id}', '{user_id}')`

**UI Distinction**:
- In left sidebar, show Personal Notes and Saved Posts under a "My Topics" section header (or with a visual separator)
- Use distinct icons: Personal Notes (📝 or Lucide `FileText`), Saved Posts (🔖 or Lucide `Bookmark`)

---

## 6. Performance Optimization

### Real-time Updates (Optional - Phase 2):
- Consider using WebSockets (Socket.io) or Server-Sent Events (SSE) for real-time updates
- Real-time features:
  - New posts appear automatically without page refresh
  - New comments and reactions update in real-time
  - "User is typing" indicator in comment input
  - Live notification badge update for pending posts
- **Fallback for MVP**: Implement manual refresh button or polling (refresh every 60 seconds)

### Database Optimization:
- **Indexes** (already included in schema above):
  - `feed_posts`: `idx_status`, `idx_approved_at`, `idx_created_at`, `idx_user`, `idx_deleted`
  - `feed_post_topics`: `idx_post`, `idx_topic`, `unique_post_topic`
  - `feed_comments`: `idx_post`, `idx_parent`, `idx_user`, `idx_deleted`
  - `feed_reactions`: `idx_post`, `idx_user`, `unique_user_emoji_reaction`
  - `feed_views`: `idx_post`, `idx_user`, `idx_viewed_at`, `unique_user_view`
  - `feed_topics`: `idx_owner`, `idx_deleted`, `idx_display_order`
- **Cursor-based pagination**: Use `approved_at` or `created_at` as cursor (not offset-based)
  - Query: `WHERE approved_at < <cursor> ORDER BY approved_at DESC LIMIT 10`
- **Query optimization**:
  - Use JOINs efficiently (avoid N+1 queries)
  - Fetch user data (avatar, username) in single query with posts
  - Fetch reaction counts and comment counts in single aggregated query
  - Cache topic list (rarely changes) - use in-memory cache or Redis

### Frontend Optimization:
- **Lazy loading**:
  - Images: Use Intersection Observer to load images only when in viewport
  - Videos: Load video only when in viewport
  - Infinite scroll: Load next batch only when user scrolls near bottom
- **Image compression**: Compress uploaded images before storing in S3 (use `sharp` or `jimp` library)
- **Video optimization**: 
  - Validate video duration on upload (max 2 minutes)
  - Consider transcoding videos to web-optimized format (future enhancement)
- **Code splitting**: Lazy load PDF viewer and video player components (use dynamic imports)

### Mobile App Considerations:
- Design API responses to be mobile-friendly (minimize payload size)
- Support pagination and infinite scroll in mobile app
- Optimize image sizes for mobile screens
- Consider offline support (cache posts for offline viewing - future enhancement)

---

## 7. UI/UX Requirements

### Design Style:
- **Consistency**: Match existing JSR Task Management System design
  - Use existing Tailwind CSS utility classes
  - Follow existing color scheme (primary, secondary, accent colors)
  - Use existing typography (font family, sizes, weights)
  - Reuse existing components (buttons, modals, dropdowns, avatars)
- **Responsive design**: Mobile-first approach
  - Mobile (<640px): Single column, hide left sidebar (show as drawer/modal), stack elements vertically
  - Tablet (640px-1024px): Two columns (left sidebar + center feed), hide right sidebar
  - Desktop (>1024px): Three columns (left sidebar + center feed + right sidebar if implemented)
- **Icon library**: Use Lucide React (same as existing codebase, e.g., `BarChart3` icon in bugs page)

### Components to Create:

1. **`FeedPost`** - Individual post card component
   - Props: `post` (post object), `onReact`, `onComment`, `onSave`, `onDelete`, `onEdit`
   - Displays post header (avatar, username, timestamp, topics), content (based on type), description, reactions, comments, actions
   - Handles different content types (text, link, PDF, YouTube, image, video)

2. **`CommentThread`** - Threaded comment display component
   - Props: `comments` (array of comment objects), `postId`, `onReply`, `onEdit`, `onDelete`
   - Displays top-level comments and nested replies (max 2 levels)
   - Handles comment input for replies
   - Shows edit/delete buttons for comment author

3. **`ReactionPicker`** - Emoji reaction selector
   - Props: `postId`, `userReactions` (array of emojis user has reacted with), `onReact`
   - Displays available emojis in a popover/dropdown
   - Highlights emojis user has already reacted with
   - Toggles reaction on click (add/remove)

4. **`PostCreator`** - Post creation form/modal
   - Props: `onSubmit`, `onCancel`, `defaultTopic` (optional, for Personal Notes)
   - Modal or slide-in panel with form fields (topic selection, content input, file upload, description)
   - Handles file upload to S3
   - Auto-detects content type
   - Validates input and shows errors

5. **`TopicSidebar`** - Left sidebar with topic list
   - Props: `topics` (array of topic objects), `selectedTopicId`, `onSelectTopic`
   - Displays public topics and user's personal/saved topics
   - Shows post count badge for each topic
   - Highlights selected topic
   - Responsive: Drawer/modal on mobile, fixed sidebar on desktop

6. **`SeenByModal`** - Modal showing list of viewers
   - Props: `postId`, `viewers` (array of viewer objects), `onClose`
   - Displays list of users who viewed the post (avatar, username, view timestamp)
   - Sorted by most recent view first
   - Only shown to users with appropriate roles

7. **`MediaViewer`** - Component to display different media types
   - Props: `contentType`, `contentUrl`, `description`
   - Renders appropriate viewer based on content type:
     - Text: Markdown renderer
     - Link: Preview card with OG metadata
     - PDF: PDF viewer (react-pdf)
     - YouTube: Embedded iframe
     - Image: Image with lightbox
     - Video: HTML5 video player
   - Handles loading states and errors

8. **`PendingPostsPage`** - Approval page for pending posts (at `/feed/pending`)
   - Displays list of pending posts with preview
   - Shows "Approve" and "Reject" buttons for each post
   - Only accessible to management roles

### Accessibility:
- **Keyboard navigation**: All interactive elements (buttons, links, inputs) must be keyboard accessible
  - Tab order should be logical (top to bottom, left to right)
  - Enter/Space to activate buttons
  - Escape to close modals
- **ARIA labels**: Add descriptive labels for screen readers
  - `aria-label` for icon-only buttons (e.g., "React with heart emoji", "Save post")
  - `role="feed"` for feed container
  - `role="article"` for each post
  - `aria-live="polite"` for dynamic content updates (new posts, comments)
- **Alt text**: All images must have descriptive alt text
  - User avatars: `alt="{username}'s avatar"`
  - Post images: Use description or filename as fallback
- **Color contrast**: Ensure text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Focus indicators**: Visible focus outline for keyboard navigation
- **Video captions**: Encourage users to upload videos with captions (optional for MVP, required for accessibility compliance)

---

## 8. API Endpoints to Create

### Feed Posts:
- **`GET /api/feed/posts`** - Get paginated posts
  - Query params: `cursor` (timestamp), `limit` (default 10), `topicId` (optional), `search` (optional), `userId` (optional, for user's own posts)
  - Response: `{ posts: [...], nextCursor: "...", hasMore: true/false }`
  - Filters: Apply topic filter, search filter, exclude deleted posts, exclude pending posts (unless user is management)
  - Sort: By `approved_at DESC` (or `created_at DESC` for auto-published posts)

- **`POST /api/feed/posts`** - Create new post
  - Body: `{ topicIds: [...], contentType: "...", contentUrl: "...", contentText: "...", description: "..." }`
  - Validation: Check user role, validate required fields, validate file URLs
  - Logic: Generate `post_id`, set `status` based on user role, set `approved_at` if auto-published
  - Response: `{ success: true, post: {...} }`

- **`PATCH /api/feed/posts/[postId]`** - Update post
  - Body: `{ topicIds: [...], description: "..." }` (only allow editing topics and description, not content)
  - Validation: Check user is post author or admin
  - Response: `{ success: true, post: {...} }`

- **`DELETE /api/feed/posts/[postId]`** - Delete post (soft delete)
  - Validation: Check user is post author or admin
  - Logic: Set `deleted_at = NOW()`, `deleted_by = <user_id>`
  - Response: `{ success: true }`

- **`POST /api/feed/posts/[postId]/approve`** - Approve pending post (management only)
  - Validation: Check user role (management, top_management, admin)
  - Logic: Set `status = 'approved'`, `approved_at = NOW()`, `approved_by = <user_id>`
  - Response: `{ success: true, post: {...} }`

- **`POST /api/feed/posts/[postId]/reject`** - Reject pending post (management only)
  - Validation: Check user role (management, top_management, admin)
  - Logic: Set `status = 'rejected'`
  - Response: `{ success: true }`

### Topics:
- **`GET /api/feed/topics`** - Get all topics
  - Query params: `includePersonal` (boolean, default false)
  - Response: `{ topics: [...] }`
  - Logic: Fetch public topics + user's personal/saved topics (if `includePersonal = true`)
  - Sort: By `display_order ASC`

- **`POST /api/feed/topics`** - Create topic (admin only)
  - Body: `{ topicName: "...", description: "...", icon: "...", displayOrder: 0 }`
  - Validation: Check user is admin (`is_system_admin = 1`)
  - Response: `{ success: true, topic: {...} }`

- **`PATCH /api/feed/topics/[topicId]`** - Update topic (admin only)
  - Body: `{ topicName: "...", description: "...", icon: "...", displayOrder: 0 }`
  - Validation: Check user is admin
  - Response: `{ success: true, topic: {...} }`

- **`DELETE /api/feed/topics/[topicId]`** - Delete topic (admin only, soft delete)
  - Validation: Check user is admin
  - Logic: Set `deleted_at = NOW()`, `deleted_by = <user_id>`
  - Response: `{ success: true }`

### Reactions:
- **`POST /api/feed/posts/[postId]/reactions`** - Add or remove reaction
  - Body: `{ emoji: "🧡" }`
  - Logic: Check if reaction exists (user + emoji + post), if exists delete (toggle off), if not exists insert (toggle on)
  - Response: `{ success: true, action: "added" | "removed" }`

- **`GET /api/feed/posts/[postId]/reactions`** - Get all reactions for a post
  - Response: `{ reactions: [{ emoji: "🧡", count: 5, users: [{userId, username, avatar}, ...] }, ...] }`
  - Logic: Group by emoji, count, fetch user details

### Comments:
- **`GET /api/feed/posts/[postId]/comments`** - Get comments for a post (with threading)
  - Response: `{ comments: [...] }` (nested structure with replies)
  - Logic: Fetch top-level comments (`parent_comment_id = NULL`), then fetch replies for each comment
  - Sort: Top-level comments by `created_at ASC` (oldest first), replies by `created_at ASC`

- **`POST /api/feed/posts/[postId]/comments`** - Create comment
  - Body: `{ commentText: "...", parentCommentId: "..." }` (parentCommentId optional for top-level)
  - Validation: Check commentText is not empty
  - Logic: Generate `comment_id`, insert into `feed_comments`
  - Response: `{ success: true, comment: {...} }`

- **`PATCH /api/feed/comments/[commentId]`** - Update comment
  - Body: `{ commentText: "..." }`
  - Validation: Check user is comment author
  - Logic: Update `comment_text`, set `updated_at = NOW()`
  - Response: `{ success: true, comment: {...} }`

- **`DELETE /api/feed/comments/[commentId]`** - Delete comment (soft delete)
  - Validation: Check user is comment author or admin
  - Logic: Set `deleted_at = NOW()`, `deleted_by = <user_id>`
  - Response: `{ success: true }`

### Views:
- **`POST /api/feed/posts/[postId]/view`** - Track post view
  - Body: None (user_id from session)
  - Logic: Insert into `feed_views` (ignore if already exists due to UNIQUE constraint)
  - Response: `{ success: true }`

- **`GET /api/feed/posts/[postId]/viewers`** - Get list of viewers
  - Validation: Check user role (top_management, management, amtarikshian, employee, admin)
  - Response: `{ viewers: [{userId, username, avatar, viewedAt}, ...] }`
  - Sort: By `viewed_at DESC` (most recent first)

### File Upload:
- **`POST /api/feed/upload`** - Upload file to S3
  - Body: FormData with file
  - Validation: Check file type, file size
  - Logic: Upload to S3 bucket `amtariksha`, folder `feed-uploads/`, generate unique filename
  - Response: `{ success: true, url: "https://amtariksha.s3.ap-south-1.amazonaws.com/feed-uploads/..." }`

### Saved Posts:
- **`POST /api/feed/posts/[postId]/save`** - Save post to Saved Posts
  - Logic: Get user's Saved Posts topic ID, insert into `feed_post_topics` (post_id, topic_id)
  - Response: `{ success: true, action: "saved" }`

- **`DELETE /api/feed/posts/[postId]/save`** - Unsave post from Saved Posts
  - Logic: Get user's Saved Posts topic ID, delete from `feed_post_topics` (post_id, topic_id)
  - Response: `{ success: true, action: "unsaved" }`

---

## 9. Implementation Steps (Suggested Order)

### Phase 1: Foundation (Database + Basic UI)
1. **Database setup**: 
   - Create migration files for all new tables (`feed_topics`, `feed_posts`, `feed_post_topics`, `feed_reactions`, `feed_comments`, `feed_views`)
   - Run migrations to create tables
   - Seed initial public topics (Latest Technologies, Amtariksha Updates, AI, Robotics, Software Development, Ideas)

2. **Navigation**: 
   - Add "Feed" menu item to horizontal navbar (use Lucide `Rss` or `MessageSquare` icon)
   - Create route `/feed` and page file `apps/web/src/app/feed/page.tsx`

3. **Basic feed page layout**: 
   - Create 3-column layout (left sidebar, center feed, right sidebar placeholder)
   - Make responsive (mobile: single column, tablet: 2 columns, desktop: 3 columns)
   - Add search bar and filter controls at top of center feed

### Phase 2: Topics & Post Display
**[XX] 4. Topic management (admin)**:
   - Create admin page `/admin/feed-topics`
   - Implement topic CRUD operations (create, edit, delete, reorder)
   - Create API routes: `GET /api/feed/topics`, `POST /api/feed/topics`, `PATCH /api/feed/topics/[topicId]`, `DELETE /api/feed/topics/[topicId]`

**[XX] 5. Topic sidebar**:
   - Create `TopicSidebar` component
   - Fetch and display public topics + user's personal/saved topics
   - Implement topic selection (filter feed by topic)
   - Show post count badge for each topic

**[XX] 6. Post display**:
   - Create `FeedPost` component
   - Create `MediaViewer` component (handle all content types: text, link, PDF, YouTube, image, video)
   - Implement API route: `GET /api/feed/posts` (with pagination, filters)
   - Display posts in center feed with infinite scroll
   - Implement cursor-based pagination

### Phase 3: Post Creation & Approval
**[XX] 7. Post creation**:
   - Create `PostCreator` component (modal or slide-in panel)
   - Implement file upload to S3: `POST /api/feed/upload`
   - Implement auto-detection of content type
   - Implement API route: `POST /api/feed/posts`
   - Handle auto-publish vs pending approval based on user role

**[XX] 8. Approval workflow**:
   - Create pending posts page: `/feed/pending`
   - Implement API routes: `POST /api/feed/posts/[postId]/approve`, `POST /api/feed/posts/[postId]/reject`
   - Add notification badge to "Feed" menu item (count of pending posts)
   - Only show to management roles

### Phase 4: Interactions (Reactions, Comments, Views)
**[XX] 9. Reactions**:
   - Create `ReactionPicker` component
   - Implement API routes: `POST /api/feed/posts/[postId]/reactions`, `GET /api/feed/posts/[postId]/reactions`
   - Display reaction counts and user lists
   - Handle toggle (add/remove reaction)

**[XX] 10. Comments**:
    - Create `CommentThread` component
    - Implement API routes: `GET /api/feed/posts/[postId]/comments`, `POST /api/feed/posts/[postId]/comments`, `PATCH /api/feed/comments/[commentId]`, `DELETE /api/feed/comments/[commentId]`
    - Implement threaded comment display (max 2 levels)
    - Handle comment creation, editing, deletion

**[XX] 11. "Seen by" feature**:
    - Implement view tracking with Intersection Observer (auto-track when post in viewport >2 seconds)
    - Implement API routes: `POST /api/feed/posts/[postId]/view`, `GET /api/feed/posts/[postId]/viewers`
    - Create `SeenByModal` component
    - Only show to users with appropriate roles

### Phase 5: Personal & Saved Posts
**[XX] 12. Personal Notes**:
    - Implement auto-creation of Personal Notes topic on user first login/access
    - Add logic to filter posts by Personal Notes topic (enforce privacy)
    - Allow post creation directly in Personal Notes
    - Allow forwarding posts from Personal Notes to public topics

**[XX] 13. Saved Posts**:
    - Implement auto-creation of Saved Posts topic on user first login/access
    - Implement API routes: `POST /api/feed/posts/[postId]/save`, `DELETE /api/feed/posts/[postId]/save`
    - Add "Save" button to post action menu
    - Display saved posts in Saved Posts feed

### Phase 6: Search, Filters, & Polish
**[XX] 14. Search & filters**:
    - Implement full-text search across post descriptions and tags
    - Implement topic filter dropdown (sync with sidebar selection)
    - Implement "Clear filters" button
    - Add sort options (newest first, most reactions, most comments)

**[XX] 15. Performance optimization**:
    - Add database indexes (already defined in schema)
    - Implement lazy loading for images and videos (Intersection Observer)
    - Implement image compression on upload
    - Cache topic list (in-memory or Redis)
    - Optimize queries (avoid N+1, use JOINs)

16. **Testing & bug fixes**:
    - Test all features end-to-end
    - Test edge cases (empty states, error states, permission checks)
    - Test on different screen sizes (mobile, tablet, desktop)
    - Test with different user roles (admin, management, employee, etc.)
    - Fix any bugs or issues

17. **Accessibility & polish**:
    - Add keyboard navigation support
    - Add ARIA labels for screen readers
    - Ensure color contrast meets WCAG AA standards
    - Add loading states and error messages
    - Polish UI (animations, transitions, hover states)

### Phase 7: Future Enhancements (Post-MVP)
18. **Real-time updates**: Implement WebSockets or SSE for live updates
19. **Mobile app integration**: Implement share-to-app functionality
20. **Trending topics**: Add trending topics to right sidebar
21. **Notifications**: Send email/push notifications for comments, reactions, approvals
22. **Analytics**: Track post views, engagement metrics, popular topics
23. **Video transcoding**: Optimize videos for web playback
24. **Offline support**: Cache posts for offline viewing in mobile app

---

## 10. Security & Permissions

### Role-based Access Control:
- **Auto-publish roles**: `admin`, `top_management`, `management`, `amtarikshian`, `employee`
  - Posts immediately published (`status = 'published'`, `approved_at = created_at`)
- **Pending approval roles**: All other roles
  - Posts go to pending state (`status = 'pending'`)
- **Admin panel access**: `is_system_admin = 1` only
  - Can manage topics (create, edit, delete, reorder)
- **Approval access**: `admin`, `top_management`, `management`
  - Can approve/reject pending posts
- **"Seen by" visibility**: `top_management`, `management`, `amtarikshian`, `employee`, `admin`
  - Only these roles can see view tracking

### Data Validation:
- **File upload**:
  - Validate file type (whitelist: JPG, PNG, GIF, WebP, MP4, WebM, PDF)
  - Validate file size (max 50MB for videos, 10MB for images, 20MB for PDFs)
  - Validate video duration (max 2 minutes) - use `ffprobe` or similar
  - Generate unique filenames to prevent collisions
- **User input**:
  - Sanitize all user input to prevent XSS attacks (use DOMPurify or similar)
  - Validate URLs (check format, prevent javascript: protocol)
  - Validate YouTube URLs (extract video ID safely, prevent XSS)
  - Escape HTML in comments and descriptions
- **Rate limiting**:
  - Limit post creation to 10 posts per hour per user (prevent spam)
  - Limit comment creation to 50 comments per hour per user
  - Limit reaction toggles to 100 per hour per user
- **SQL injection prevention**:
  - Use parameterized queries (prepared statements) for all database operations
  - Never concatenate user input into SQL queries

### Privacy:
- **Personal Notes**: Strictly private
  - Enforce in all queries: `WHERE owner_user_id = <current_user_id>`
  - Never expose in public feed or API responses to other users
- **Saved Posts**: Strictly private
  - Enforce in all queries: `WHERE owner_user_id = <current_user_id>`
  - Never expose in public feed or API responses to other users
- **Post editing/deletion**: Only post author or admin can edit/delete
  - Check `user_id = <current_user_id> OR is_system_admin = 1`
- **Comment editing/deletion**: Only comment author or admin can edit/delete
  - Check `user_id = <current_user_id> OR is_system_admin = 1`
- **Soft delete**: Use soft delete for audit trail
  - Set `deleted_at` and `deleted_by` instead of hard delete
  - Exclude deleted records from all queries: `WHERE deleted_at IS NULL`

### Authentication:
- Use existing JWT authentication system
- Verify JWT token on all API requests
- Extract `user_id` and `role` from JWT payload
- Reject requests with invalid or expired tokens

---

## 11. Questions to Clarify Before Starting

1. **Personal Notes vs Saved Posts storage**:
   - **Personal Notes**: Should these be stored as regular posts in `feed_posts` table (with topic = Personal Notes), OR in a separate table (e.g., `personal_notes`) with simpler schema? OK 
   - **Recommendation**: Store as regular posts in `feed_posts` for consistency and to reuse all existing features (reactions, comments, views). This also allows forwarding to public topics easily.> OK

2. **Saved Posts implementation**:
   - Confirmed: Saved Posts are references to existing posts (not copies), implemented via `feed_post_topics` table linking post to user's Saved Posts topic. 

3. **Comment threading depth**:
   - Confirmed: Max 2 levels (top-level comments + replies). Replies to replies should either be flattened to same level or not allowed.

4. **Real-time updates**:
   - Should we implement real-time updates (WebSockets/SSE) in MVP, or defer to Phase 2? phase 2 (keep a note of this for later use, and send me the details, so i can remind you)
   - **Recommendation**: Defer to Phase 2. Use manual refresh button or polling (every 60 seconds) for MVP.

5. **Video duration validation**:
   - Confirmed: Max 2 minutes for uploaded videos. Should we validate on client-side (before upload) or server-side (after upload)?
   - **Recommendation**: Both. Client-side for better UX (immediate feedback), server-side for security (prevent bypass).

6. **Open Graph metadata fetching**:
   - For link previews, should we fetch OG metadata on server-side (when post is created) or client-side (when post is displayed)?
   - **Recommendation**: Server-side (when post is created) to avoid CORS issues and cache metadata. Store in `feed_posts` table (add columns: `og_title`, `og_description`, `og_image`). OK

7. **Notification system**:
   - Should we send email notifications for comments, reactions, approvals in MVP? Only in the mobile app push noticfication: Defer to phase 2 keep a note of this for later use, and send me the details, so i can remind you)
   - **Recommendation**: Defer to Phase 2. Focus on core feed functionality first. 

8. **Mobile app timeline**:
   - When is mobile app expected to launch? Should we prioritize mobile-responsive web design or native mobile app features?
   - **Recommendation**: Prioritize mobile-responsive web design for MVP. Mobile app share-to-feed feature can be added in Phase 2.

---

## Notes
- The selected code snippet shows a `BarChart3` icon from Lucide React, confirming the project uses Lucide React for icons. Use the same icon library for consistency in the Feed feature.
- Reuse existing components and utilities from the JSR Task Management System where possible:
  - Avatar component (likely exists for user profiles)
  - Modal/dialog component (likely exists for confirmations)
  - Dropdown component (likely exists for filters)
  - Button component (likely exists with consistent styling)
  - Toast/notification component (likely exists for success/error messages)
- Follow the existing code style and patterns in the codebase:
  - File structure (e.g., `apps/web/src/app/...` for pages, `apps/web/src/components/...` for components)
  - API route structure (e.g., `apps/web/src/app/api/...`)
  - Database connection pattern (use existing connection pool)
  - Authentication pattern (use existing JWT middleware)
- The project uses postgres on supabase with 50-connection pool, deployed on Vercel serverless. Optimize queries for serverless environment (minimize connection time, use connection pooling).
- The project uses AWS S3 for file storage (bucket: `amtariksha`, region: `ap-south-1`). Reuse existing S3 configuration and upload utilities.
- The project has email service configured with Gmail SMTP. Can be used for future notification features (Phase 2).