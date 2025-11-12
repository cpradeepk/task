/**
 * GraphQL Queries and Mutations for Mobile App
 * 
 * Centralized location for all GraphQL operations.
 * Organized by feature: Auth, Tasks, Bugs, Feed, Notifications, etc.
 */

import { gql } from '@apollo/client'

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const LOGIN_MUTATION = gql`
  mutation Login($employeeId: String!, $password: String!) {
    login(employeeId: $employeeId, password: $password) {
      token
      user {
        employeeId
        name
        email
        phone
        department
        role
        status
        isTodayTask
        warningCount
      }
    }
  }
`

// ============================================================================
// TASKS
// ============================================================================

export const GET_TASKS = gql`
  query GetTasks($assignedTo: String, $status: String, $priority: String, $limit: Int, $offset: Int) {
    tasks(assignedTo: $assignedTo, status: $status, priority: $priority, limit: $limit, offset: $offset) {
      id
      taskId
      name
      description
      selectType
      recursiveType
      assignedTo
      assignedBy
      support
      startDate
      endDate
      priority
      estimatedHours
      actualHours
      dailyHours
      status
      remarks
      difficulties
      relatedTasks
      projectId
      subprojectId
      parentTaskId
      department
      timerState
      createdAt
      updatedAt
      assignedToUsers {
        employeeId
        name
        email
      }
      assignedByUser {
        employeeId
        name
        email
      }
      project {
        projectId
        projectName
        parentProjectId
      }
    }
  }
`

export const GET_TASK = gql`
  query GetTask($taskId: ID!) {
    task(taskId: $taskId) {
      id
      taskId
      name
      description
      selectType
      recursiveType
      assignedTo
      assignedBy
      support
      startDate
      endDate
      priority
      estimatedHours
      actualHours
      dailyHours
      status
      remarks
      difficulties
      relatedTasks
      projectId
      subprojectId
      parentTaskId
      department
      timerState
      createdAt
      updatedAt
      subtasks {
        id
        subTaskId
        description
        assignedTo
        assignedBy
        startDate
        endDate
        priority
        estimatedHours
        actualHours
        status
        remarks
        isCompleted
        displayOrder
        createdAt
        updatedAt
      }
    }
  }
`

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      taskId
      name
      description
      assignedTo
      assignedBy
      startDate
      endDate
      priority
      estimatedHours
      status
    }
  }
`

export const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
    updateTask(taskId: $taskId, input: $input) {
      taskId
      name
      description
      status
      remarks
      actualHours
    }
  }
`

// ============================================================================
// BUGS
// ============================================================================

export const GET_BUGS = gql`
  query GetBugs($assignedTo: String, $status: String, $severity: String, $category: String, $limit: Int, $offset: Int) {
    bugs(assignedTo: $assignedTo, status: $status, severity: $severity, category: $category, limit: $limit, offset: $offset) {
      bugId
      title
      description
      severity
      priority
      status
      category
      platform
      assignedTo
      assignedBy
      reportedBy
      reportedDate
      resolvedDate
      startDate
      endDate
      environment
      type
      feature
      projectId
      subprojectId
      relatedBugs
      bugType
      criticality
      estimatedHours
      actualHours
      remarks
      timerState
      createdAt
      updatedAt
      assignedToUser {
        employeeId
        name
        email
      }
      assignedByUser {
        employeeId
        name
        email
      }
      reportedByUser {
        employeeId
        name
        email
      }
      project {
        projectId
        projectName
        parentProjectId
      }
    }
  }
`

export const GET_BUG = gql`
  query GetBug($bugId: ID!) {
    bug(bugId: $bugId) {
      bugId
      title
      description
      severity
      priority
      status
      category
      platform
      assignedTo
      assignedBy
      reportedBy
      reportedDate
      resolvedDate
      startDate
      endDate
      environment
      attachments
      type
      feature
      projectId
      subprojectId
      relatedBugs
      bugType
      criticality
      parentDevId
      estimatedHours
      actualHours
      remarks
      timerState
      timerStartTime
      timerPausedTime
      timerTotalTime
      createdAt
      updatedAt
      subtasks {
        id
        subTaskId
        description
        assignedTo
        assignedBy
        startDate
        endDate
        priority
        estimatedHours
        actualHours
        status
        remarks
        isCompleted
        displayOrder
        createdAt
        updatedAt
      }
    }
  }
`

export const CREATE_BUG = gql`
  mutation CreateBug($input: CreateBugInput!) {
    createBug(input: $input) {
      bugId
      title
      description
      severity
      priority
      status
      category
      platform
      type
    }
  }
`

export const UPDATE_BUG = gql`
  mutation UpdateBug($bugId: ID!, $input: UpdateBugInput!) {
    updateBug(bugId: $bugId, input: $input) {
      bugId
      title
      description
      status
      remarks
      actualHours
    }
  }
`

// ============================================================================
// PROJECTS
// ============================================================================

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      projectId
      projectName
      description
      parentProjectId
      createdAt
      updatedAt
    }
  }
`

export const GET_PROJECT = gql`
  query GetProject($projectId: ID!) {
    project(projectId: $projectId) {
      id
      projectId
      projectName
      description
      parentProjectId
      createdAt
      updatedAt
    }
  }
`

// ============================================================================
// FEED
// ============================================================================

export const GET_FEED_POSTS = gql`
  query GetFeedPosts($topicId: String, $status: String, $search: String, $limit: Int, $offset: Int) {
    feedPosts(topicId: $topicId, status: $status, search: $search, limit: $limit, offset: $offset) {
      posts {
        postId
        contentType
        content
        linkUrl
        linkTitle
        linkDescription
        linkImage
        mediaUrls
        createdAt
        status
        author {
          employeeId
          name
        }
        topics {
          id
          topicName
          icon
        }
        reactions {
          emoji
          count
          hasUserReacted
        }
        viewCount
        commentCount
        isSaved
        hasUserReacted
      }
      total
      hasMore
    }
  }
`

export const GET_FEED_POST = gql`
  query GetFeedPost($postId: ID!) {
    feedPost(postId: $postId) {
      postId
      contentType
      content
      linkUrl
      linkTitle
      linkDescription
      linkImage
      mediaUrls
      createdAt
      updatedAt
      status
      author {
        employeeId
        name
        email
      }
      topics {
        id
        topicName
        icon
        description
      }
      reactions {
        emoji
        count
        hasUserReacted
        users {
          employeeId
          name
        }
      }
      comments {
        commentId
        content
        createdAt
        author {
          employeeId
          name
        }
        replies {
          commentId
          content
          createdAt
          author {
            employeeId
            name
          }
        }
      }
      viewCount
      commentCount
      isSaved
      hasUserReacted
    }
  }
`

export const GET_FEED_TOPICS = gql`
  query GetFeedTopics($includePersonal: Boolean) {
    feedTopics(includePersonal: $includePersonal) {
      id
      topicName
      description
      icon
      displayOrder
      isPersonal
      isSaved
      ownerUserId
      createdBy
      createdAt
      postCount
    }
  }
`

export const CREATE_FEED_POST = gql`
  mutation CreateFeedPost($input: CreateFeedPostInput!) {
    createFeedPost(input: $input) {
      postId
      contentType
      content
      status
      createdAt
    }
  }
`

export const CREATE_FEED_COMMENT = gql`
  mutation CreateFeedComment($postId: ID!, $content: String!, $parentCommentId: String) {
    createFeedComment(postId: $postId, content: $content, parentCommentId: $parentCommentId) {
      commentId
      content
      createdAt
      author {
        employeeId
        name
      }
    }
  }
`

export const TOGGLE_FEED_REACTION = gql`
  mutation ToggleFeedReaction($postId: ID!, $emoji: String!) {
    toggleFeedReaction(postId: $postId, emoji: $emoji) {
      action
      message
    }
  }
`

export const TOGGLE_FEED_SAVE = gql`
  mutation ToggleFeedSave($postId: ID!) {
    toggleFeedSave(postId: $postId) {
      action
      message
    }
  }
`

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!, $isRead: Boolean, $limit: Int, $offset: Int) {
    feedNotifications(userId: $userId, isRead: $isRead, limit: $limit, offset: $offset) {
      notificationId
      title
      message
      linkUrl
      isRead
      createdAt
      actor {
        employeeId
        name
      }
    }
  }
`

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: String!) {
    unreadNotificationCount(userId: $userId)
  }
`

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationAsRead(notificationId: $notificationId) {
      notificationId
      isRead
      readAt
    }
  }
`

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead($userId: String!) {
    markAllNotificationsAsRead(userId: $userId)
  }
`

// ============================================================================
// DASHBOARD
// ============================================================================

export const GET_DASHBOARD = gql`
  query GetDashboard($employeeId: String!, $role: String!) {
    dashboard(employeeId: $employeeId, role: $role) {
      tasks {
        total
        inProgress
        delayed
        completed
      }
      bugs {
        total
        new
        inProgress
        resolved
      }
      leaves {
        pending
        approved
        rejected
      }
      wfh {
        pending
        approved
        rejected
      }
    }
  }
`

// ============================================================================
// Leave Applications
// ============================================================================

export const GET_LEAVE_APPLICATIONS = gql`
  query GetLeaveApplications($employeeId: String, $status: String) {
    leaveApplications(employeeId: $employeeId, status: $status) {
      id
      applicationId
      employeeId
      employeeName
      leaveType
      reason
      fromDate
      toDate
      isHalfDay
      emergencyContact
      status
      managerId
      approvedBy
      approvalDate
      approvalRemarks
      createdAt
      updatedAt
    }
  }
`

export const GET_LEAVE_APPLICATION = gql`
  query GetLeaveApplication($id: ID!) {
    leaveApplication(id: $id) {
      id
      applicationId
      employeeId
      employeeName
      leaveType
      reason
      fromDate
      toDate
      isHalfDay
      emergencyContact
      status
      managerId
      approvedBy
      approvalDate
      approvalRemarks
      createdAt
      updatedAt
    }
  }
`

export const CREATE_LEAVE_APPLICATION = gql`
  mutation CreateLeaveApplication($input: CreateLeaveApplicationInput!) {
    createLeaveApplication(input: $input) {
      id
      applicationId
      status
      message
    }
  }
`

export const APPROVE_LEAVE = gql`
  mutation ApproveLeave($id: ID!, $approverId: String!, $remarks: String) {
    approveLeave(id: $id, approverId: $approverId, remarks: $remarks) {
      success
      message
    }
  }
`

export const REJECT_LEAVE = gql`
  mutation RejectLeave($id: ID!, $approverId: String!, $reason: String!) {
    rejectLeave(id: $id, approverId: $approverId, reason: $reason) {
      success
      message
    }
  }
`

export const DELETE_LEAVE = gql`
  mutation DeleteLeave($id: ID!) {
    deleteLeave(id: $id) {
      success
      message
    }
  }
`

// ============================================================================
// WFH Applications
// ============================================================================

export const GET_WFH_APPLICATIONS = gql`
  query GetWFHApplications($employeeId: String, $status: String) {
    wfhApplications(employeeId: $employeeId, status: $status) {
      id
      applicationId
      employeeId
      employeeName
      wfhType
      reason
      fromDate
      toDate
      workLocation
      availableFrom
      availableTo
      contactNumber
      status
      managerId
      approvedBy
      approvalDate
      approvalRemarks
      createdAt
      updatedAt
    }
  }
`

export const GET_WFH_APPLICATION = gql`
  query GetWFHApplication($id: ID!) {
    wfhApplication(id: $id) {
      id
      applicationId
      employeeId
      employeeName
      wfhType
      reason
      fromDate
      toDate
      workLocation
      availableFrom
      availableTo
      contactNumber
      status
      managerId
      approvedBy
      approvalDate
      approvalRemarks
      createdAt
      updatedAt
    }
  }
`

export const CREATE_WFH_APPLICATION = gql`
  mutation CreateWFHApplication($input: CreateWFHApplicationInput!) {
    createWFHApplication(input: $input) {
      id
      applicationId
      status
      message
    }
  }
`

export const APPROVE_WFH = gql`
  mutation ApproveWFH($id: ID!, $approverId: String!, $remarks: String) {
    approveWFH(id: $id, approverId: $approverId, remarks: $remarks) {
      success
      message
    }
  }
`

export const REJECT_WFH = gql`
  mutation RejectWFH($id: ID!, $approverId: String!, $reason: String!) {
    rejectWFH(id: $id, approverId: $approverId, reason: $reason) {
      success
      message
    }
  }
`

export const DELETE_WFH = gql`
  mutation DeleteWFH($id: ID!) {
    deleteWFH(id: $id) {
      success
      message
    }
  }
`
