/**
 * Type Definitions for Mobile App
 * Local type definitions to avoid dependency on @jsr/shared package
 */

// ============================================================================
// RELEASE WORK-ITEM TYPES (mirrors apps/web/src/lib/types.ts)
// ============================================================================

/**
 * A single checklist item (a test case or release step).
 * `label` is an optional short tag (e.g. "TC-01", "Step 1"); `text` is the body.
 */
export interface ReleaseChecklistItem {
  id: string
  label?: string
  text: string
}

/**
 * A checklist section scoped to a platform.
 * platform 'common' shows on every platform's checklist; 'android'/'ios' are
 * platform-specific. The sub-project's template is a list of these sections.
 */
export interface ReleaseChecklistSection {
  id: string
  title: string
  platform: 'common' | 'android' | 'ios'
  items: ReleaseChecklistItem[]
}

/** The default release checklist template stored on a (sub)project. */
export interface ReleaseChecklistTemplate {
  sections: ReleaseChecklistSection[]
}

/**
 * Per-platform snapshot stored on a release bug. The template sections are
 * snapshotted at creation; `manual` items are added on the task itself;
 * `completed` maps item id -> done.
 */
export interface ReleasePlatformChecklist {
  template: ReleaseChecklistSection[]
  manual: ReleaseChecklistItem[]
  completed: Record<string, boolean>
}

/** Full release state persisted in bugs.release_state (JSONB). */
export interface ReleaseState {
  platforms: ('android' | 'ios')[]
  checklists: {
    android?: ReleasePlatformChecklist
    ios?: ReleasePlatformChecklist
  }
  versions: {
    android?: string | null
    ios?: string | null
  }
}

export interface Project {
  projectId: string
  projectName: string
  parentProjectId?: string | null
  description?: string
  isSubproject?: boolean
  releaseEnabled?: boolean
  releaseChecklist?: ReleaseChecklistTemplate | null
}

export interface Bug {
  bugId: string
  title: string
  description: string
  status: string
  severity: string
  category: string
  platform: string
  type: 'testcase' | 'feature' | 'bug' | 'other' | 'release' | string
  releaseState?: ReleaseState | null
  projectId?: string
  subprojectId?: string
  assignedTo?: string
  reportedBy: string
  createdAt: string
  updatedAt: string
  startDate?: string
  endDate?: string
  browser?: string
  device?: string
  attachments?: Array<{
    attachmentId: string
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
  subtasks?: Array<{
    subtaskId: string
    title: string
    status: string
  }>
  project?: {
    projectId: string
    projectName: string
    description?: string
  }
  subproject?: {
    subProjectId: string
    subProjectName: string
  }
  assignedToUser?: {
    employeeId: string
    name: string
    email?: string
    role?: string
  }
}

export interface Task {
  taskId: string
  name: string
  description: string
  status: string
  priority: string
  assignedTo?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  projectId?: string
  subprojectId?: string
  parentTaskId?: string | null
  subtasks?: Array<{
    subtaskId: string
    title: string
    status: string
  }>
  project?: {
    projectId: string
    projectName: string
    parentProjectId?: string
  }
  subproject?: {
    subProjectId: string
    subProjectName: string
  }
  assignedToUsers?: Array<{
    employeeId: string
    name: string
    email?: string
  }>
}

export interface FeedPost {
  postId: string
  contentType: string
  content: string
  linkUrl?: string
  linkTitle?: string
  linkDescription?: string
  linkImage?: string
  mediaUrls?: string[]
  createdAt: string
  updatedAt?: string
  status: string
  author: {
    employeeId: string
    name: string
    email?: string
  }
  topics: FeedTopic[]
  reactions?: Array<{
    emoji: string
    count: number
    hasUserReacted: boolean
  }>
  comments?: Array<{
    commentId: string
    content: string
    createdAt: string
    author: {
      employeeId: string
      name: string
    }
  }>
  viewCount: number
  commentCount: number
  isSaved: boolean
  hasUserReacted: boolean
}

export interface FeedTopic {
  id: string
  topicName: string
  description?: string
  icon?: string
  displayOrder?: number
  isPersonal?: boolean
  isSaved?: boolean
  postCount: number
}

export interface User {
  userId: string
  employeeId: string
  name: string
  email: string
  role: string
  department?: string
  designation?: string
  /** User-specific tab access overrides; falls back to role defaults when empty. */
  tabPermissions?: string[]
}

export interface Leave {
  leaveId: string
  employeeId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface WFH {
  wfhId: string
  employeeId: string
  employeeName: string
  date: string
  reason: string
  status: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  notificationId: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  relatedId?: string
  relatedType?: string
}

export interface TaskFilters {
  searchQuery?: string
  statusFilter?: string[]
  priorityFilter?: string[]
  assigneeFilter?: string[]
}

export interface BugFilters {
  searchQuery?: string
  statusFilter?: string[]
  typeFilter?: string[]
  projectId?: string
}

