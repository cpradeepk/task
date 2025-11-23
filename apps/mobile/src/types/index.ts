/**
 * Type Definitions for Mobile App
 * Local type definitions to avoid dependency on @jsr/shared package
 */

export interface Bug {
  bugId: string
  title: string
  description: string
  status: string
  severity: string
  category: string
  platform: string
  type: string
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
  subtasks?: Array<{
    subtaskId: string
    title: string
    status: string
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

