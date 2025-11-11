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
  title: string
  content: string
  topicId: string
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
  reactions?: Array<{
    reactionId: string
    type: string
    userId: string
  }>
  comments?: Array<{
    commentId: string
    content: string
    authorId: string
    authorName: string
    createdAt: string
  }>
}

export interface FeedTopic {
  topicId: string
  name: string
  description?: string
  icon?: string
  color?: string
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

