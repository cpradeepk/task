# 🚀 Feed Feature - Team Testing Guide

## 📋 Overview
A comprehensive social media-style Feed feature has been implemented for the JSR Task Management System. This guide will help you set up and test the feature.

---

## ⚙️ Setup Instructions

### 1. Pull Latest Changes
```bash
git pull origin main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations (IMPORTANT!)
```bash
cd apps/web

# Migration 1: Create feed tables
node scripts/run-migration-032.js

# Migration 2: Fix schema issues
node scripts/run-migration-033.js
```

### 4. Restart Development Server
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

**⚠️ IMPORTANT:** You MUST restart the dev server after pulling to avoid cached compilation issues!

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Navigate to `/feed` page - should load without errors
- [ ] See the topic sidebar on the left
- [ ] See the "Create Post" button
- [ ] Personal Notes topic should auto-initialize

### Post Creation (Test All Content Types)
- [ ] **Text Post:** Create a simple text post
- [ ] **Link Post:** Share a URL (should show OpenGraph preview)
- [ ] **PDF Upload:** Upload a PDF file (requires AWS S3 credentials)
- [ ] **YouTube Video:** Paste a YouTube URL (should embed video)
- [ ] **Image Upload:** Upload an image (requires AWS S3 credentials)
- [ ] **Video Upload:** Upload a video file (requires AWS S3 credentials)

### Post Interactions
- [ ] **Reactions:** Click emoji reactions (👍 ❤️ 😂 😮 😢 🙏)
- [ ] **Comments:** Add comments to posts
- [ ] **Nested Comments:** Reply to existing comments
- [ ] **Save Post:** Save a post for later
- [ ] **View Count:** View count should increment when viewing posts

### Filtering & Search
- [ ] **Topic Filter:** Click different topics in sidebar
- [ ] **Search:** Use search bar to find posts
- [ ] **Sort Options:** Try "Latest", "Popular", "Trending"
- [ ] **Pagination:** Scroll to load more posts (20 per page)

### Role-Based Features

#### For Employees:
- [ ] Create a post - should go to "Pending Approval" status
- [ ] Cannot see own pending posts in main feed
- [ ] Can create personal notes (private)

#### For Management/Top Management/Admin:
- [ ] Create a post - should be auto-approved
- [ ] Access `/admin/feed-approvals` page
- [ ] Approve/reject pending posts
- [ ] Access `/admin/feed-topics` page
- [ ] Create/edit/delete topics

### Personal Notes
- [ ] Click "Personal Notes" topic
- [ ] Create a private note
- [ ] Verify it's only visible to you
- [ ] Switch to other topics and back

---

## 🎨 Features Implemented

### 6 Database Tables
1. `feed_topics` - Topic categories
2. `feed_posts` - Post content
3. `feed_post_topics` - Many-to-many relationship
4. `feed_comments` - Nested comments
5. `feed_reactions` - Emoji reactions
6. `feed_saved_posts` - Saved posts per user

### 10 API Routes
- `/api/feed/posts` - List/create posts
- `/api/feed/posts/[postId]/approve` - Approve/reject
- `/api/feed/posts/[postId]/comments` - Comments
- `/api/feed/posts/[postId]/reactions` - Reactions
- `/api/feed/posts/[postId]/save` - Save/unsave
- `/api/feed/posts/[postId]/views` - View tracking
- `/api/feed/topics` - Topic management
- `/api/feed/topics/[topicId]` - Single topic
- `/api/feed/topics/init-personal` - Initialize personal topic
- `/api/feed/og-preview` - OpenGraph preview

### 4 React Components
- `PostCreator` - Create post modal
- `FeedPost` - Post display card
- `Comments` - Nested comments
- `TopicSidebar` - Topic filtering

### 2 Admin Pages
- `/admin/feed-topics` - Manage topics
- `/admin/feed-approvals` - Approve posts

---

## 🐛 Known Issues & Limitations

1. **Activity Logging Disabled**
   - Feed posts are NOT logged to activity_log table
   - Reason: entity_type constraint doesn't include 'feed_post'
   - Future: Add to constraint OR create separate feed_activity_log table

2. **File Uploads Require AWS S3**
   - PDF, image, and video uploads need AWS credentials in `.env.local`
   - If not configured, file upload features won't work

3. **Dev Server Cache**
   - If you see errors about `ft.topic_id`, restart your dev server
   - This is a Next.js compilation cache issue

---

## 📊 Testing Scenarios

### Scenario 1: Employee Workflow
1. Login as employee
2. Create a text post
3. Verify it shows "Pending Approval"
4. Ask a manager to approve it
5. Verify it appears in feed after approval

### Scenario 2: Manager Workflow
1. Login as manager
2. Create a post (should auto-approve)
3. Go to `/admin/feed-approvals`
4. Approve/reject pending posts from employees

### Scenario 3: Content Variety
1. Create posts with all 6 content types
2. Verify each displays correctly
3. Test interactions on each type

### Scenario 4: Social Interactions
1. React to posts with different emojis
2. Add comments
3. Reply to comments (nested)
4. Save posts
5. Verify saved posts appear in "Saved" filter

---

## 🆘 Troubleshooting

### Error: "column ft.topic_id does not exist"
**Solution:** Restart your Next.js dev server

### Error: "activity_log entity_type constraint"
**Solution:** This is expected - activity logging is disabled for feed posts

### Posts not loading
**Solution:** 
1. Check if migrations ran successfully
2. Restart dev server
3. Check browser console for errors

### File uploads failing
**Solution:** Verify AWS S3 credentials in `.env.local`

---

## 📝 Feedback & Bug Reports

Please report any issues you find with:
- **What:** Description of the issue
- **Steps:** How to reproduce
- **Expected:** What should happen
- **Actual:** What actually happened
- **Role:** Your user role (employee/management/admin)
- **Browser:** Chrome/Firefox/Safari/etc.

---

## 🎯 Success Criteria

The feature is working correctly if:
- ✅ All 6 content types can be created
- ✅ Posts display correctly in feed
- ✅ Comments and reactions work
- ✅ Topic filtering works
- ✅ Search returns relevant results
- ✅ Approval workflow functions properly
- ✅ Personal notes are private
- ✅ No console errors

---

**Happy Testing! 🎉**

