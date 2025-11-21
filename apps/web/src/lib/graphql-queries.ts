/**
 * GraphQL Queries and Mutations
 * 
 * This file contains all GraphQL queries and mutations used in the application.
 * Separated from graphql-client.ts to avoid importing Apollo Client on the server side.
 */

export const QUERIES = {
  // Dashboard query - gets all data needed for the dashboard
  GET_DASHBOARD: `
    query GetDashboard($employeeId: String!, $role: String!) {
      dashboard(employeeId: $employeeId, role: $role) {
        tasks {
          id
          taskId
          selectType
          recursiveType
          description
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
          createdAt
          updatedAt
          assignedToUser {
            employeeId
            name
            email
            role
          }
          assignedByUser {
            employeeId
            name
            email
            role
          }
          supportUsers {
            employeeId
            name
            email
            role
          }
          subtasks {
            id
            subTaskId
            description
            assignedTo
            startDate
            endDate
            priority
            estimatedHours
            actualHours
            status
            remarks
          }
        }
        bugs {
          id
          bugId
          description
          category
          severity
          status
          assignedTo
          assignedBy
          reportedBy
          reportedDate
          resolvedDate
          estimatedHours
          actualHours
          remarks
          attachments
          createdAt
          updatedAt
          assignedToUser {
            employeeId
            name
            email
            role
          }
          assignedByUser {
            employeeId
            name
            email
            role
          }
          reportedByUser {
            employeeId
            name
            email
            role
          }
          subtasks {
            id
            subTaskId
            description
            assignedTo
            startDate
            endDate
            priority
            estimatedHours
            actualHours
            status
            remarks
          }
        }
        users {
          employeeId
          name
          email
          phone
          department
          role
          status
          managerEmail
          isTodayTask
          warningCount
          createdAt
          updatedAt
        }
        settings {
          id
          key
          value
          type
          isActive
          createdAt
          updatedAt
        }
      }
    }
  `,

  // Get all tasks with optional filters and pagination
  GET_TASKS: `
    query GetTasks($assignedTo: String, $status: String, $priority: String, $limit: Int, $offset: Int) {
      tasks(assignedTo: $assignedTo, status: $status, priority: $priority, limit: $limit, offset: $offset) {
        id
        taskId
        name
        selectType
        recursiveType
        description
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
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        supportUsers {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
        project {
          projectId
          projectName
          description
        }
      }
    }
  `,

  // Get single task by ID
  GET_TASK: `
    query GetTask($taskId: ID!) {
      task(taskId: $taskId) {
        id
        taskId
        name
        selectType
        recursiveType
        description
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
        department
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        supportUsers {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get all bugs with optional filters and pagination
  GET_BUGS: `
    query GetBugs($assignedTo: String, $status: String, $severity: String, $limit: Int, $offset: Int) {
      bugs(assignedTo: $assignedTo, status: $status, severity: $severity, limit: $limit, offset: $offset) {
        id
        bugId
        title
        description
        category
        severity
        priority
        status
        platform
        type
        feature
        assignedTo
        assignedBy
        reportedBy
        reportedDate
        resolvedDate
        estimatedHours
        actualHours
        remarks
        attachments
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        reportedByUser {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
        project {
          projectId
          projectName
          description
        }
      }
    }
  `,

  // Get single bug by ID
  GET_BUG: `
    query GetBug($bugId: ID!) {
      bug(bugId: $bugId) {
        id
        bugId
        title
        description
        category
        severity
        priority
        status
        assignedTo
        assignedBy
        reportedBy
        reportedDate
        resolvedDate
        startDate
        endDate
        estimatedHours
        actualHours
        remarks
        attachments
        projectId
        subprojectId
        relatedBugs
        platform
        type
        feature
        environment
        bugType
        criticality
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        reportedByUser {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get all users
  GET_USERS: `
    query GetUsers {
      users {
        employeeId
        name
        email
        phone
        department
        role
        status
        managerEmail
        isTodayTask
        warningCount
        createdAt
        updatedAt
      }
    }
  `,

  // Get all projects
  GET_PROJECTS: `
    query GetProjects {
      projects {
        id
        projectId
        projectName
        description
        deletedAt
        deletedBy
        createdAt
        updatedAt
      }
    }
  `,

  // Get single project by ID
  GET_PROJECT: `
    query GetProject($projectId: ID!) {
      project(projectId: $projectId) {
        id
        projectId
        projectName
        description
        deletedAt
        deletedBy
        createdAt
        updatedAt
        tasks {
          id
          taskId
          description
          status
          assignedTo
          assignedBy
          startDate
          endDate
          priority
        }
      }
    }
  `,

  // Get all settings
  GET_SETTINGS: `
    query GetSettings($activeOnly: Boolean) {
      settings(activeOnly: $activeOnly) {
        id
        key
        value
        type
        isActive
        createdAt
        updatedAt
      }
    }
  `,

  // Get single setting by key
  GET_SETTING: `
    query GetSetting($key: String!) {
      setting(key: $key) {
        id
        key
        value
        type
        isActive
        createdAt
        updatedAt
      }
    }
  `,

  // Feed Queries
  GET_FEED_POSTS: `
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
  `,

  GET_FEED_POST: `
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
  `,

  GET_FEED_TOPICS: `
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
  `,

  GET_FEED_COMMENTS: `
    query GetFeedComments($postId: ID!) {
      feedComments(postId: $postId) {
        commentId
        postId
        parentCommentId
        content
        createdAt
        updatedAt
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
    }
  `,

  GET_FEED_REACTIONS: `
    query GetFeedReactions($postId: ID!) {
      feedReactions(postId: $postId) {
        emoji
        count
        hasUserReacted
        users {
          employeeId
          name
        }
      }
    }
  `,

  // Attendance Queries
  GET_ATTENDANCE: `
    query GetAttendance($date: String!) {
      attendance(date: $date) {
        id
        employeeId
        signInTime
        signOutTime
        workHours
        date
        status
        isManualEntry
        approvalStatus
        createdAt
        updatedAt
        user {
          employeeId
          name
          email
          role
        }
      }
    }
  `,

  GET_MONTHLY_ATTENDANCE: `
    query GetMonthlyAttendance($year: Int!, $month: Int!) {
      monthlyAttendance(year: $year, month: $month) {
        id
        employeeId
        signInTime
        signOutTime
        workHours
        date
        status
        isManualEntry
        approvalStatus
      }
    }
  `,

  GET_HOME_DASHBOARD_DATA: `
    query GetHomeDashboardData($date: String!) {
      homeDashboardData(date: $date) {
        userWorkHours
        membersOnLeave {
          user {
            employeeId
            name
            role
          }
          leaveType
        }
        membersOnWFH {
          user {
            employeeId
            name
            role
          }
        }
        attendance {
          id
          signInTime
          signOutTime
          workHours
          status
        }
      }
    }
  `
}

export const MUTATIONS = {
  // Create a new task
  CREATE_TASK: `
    mutation CreateTask($input: TaskInput!) {
      createTask(input: $input) {
        id
        taskId
        description
        status
      }
    }
  `,

  // Update an existing task
  UPDATE_TASK: `
    mutation UpdateTask($taskId: String!, $input: TaskInput!) {
      updateTask(taskId: $taskId, input: $input) {
        id
        taskId
        description
        status
      }
    }
  `,

  // Delete a task
  DELETE_TASK: `
    mutation DeleteTask($taskId: String!) {
      deleteTask(taskId: $taskId)
    }
  `,

  // Create a new bug
  CREATE_BUG: `
    mutation CreateBug($input: BugInput!) {
      createBug(input: $input) {
        id
        bugId
        description
        status
      }
    }
  `,

  // Update an existing bug
  UPDATE_BUG: `
    mutation UpdateBug($bugId: String!, $input: BugInput!) {
      updateBug(bugId: $bugId, input: $input) {
        id
        bugId
        description
        status
      }
    }
  `,

  // Delete a bug
  DELETE_BUG: `
    mutation DeleteBug($bugId: String!) {
      deleteBug(bugId: $bugId)
    }
  `,

  // Feed Mutations
  CREATE_FEED_POST: `
    mutation CreateFeedPost($input: CreateFeedPostInput!) {
      createFeedPost(input: $input) {
        postId
        contentType
        content
        status
        createdAt
        author {
          employeeId
          name
        }
        topics {
          id
          topicName
        }
      }
    }
  `,

  UPDATE_FEED_POST: `
    mutation UpdateFeedPost($postId: ID!, $input: UpdateFeedPostInput!) {
      updateFeedPost(postId: $postId, input: $input) {
        postId
        contentType
        content
        status
        updatedAt
      }
    }
  `,

  DELETE_FEED_POST: `
    mutation DeleteFeedPost($postId: ID!) {
      deleteFeedPost(postId: $postId)
    }
  `,

  CREATE_FEED_COMMENT: `
    mutation CreateFeedComment($postId: ID!, $content: String!, $parentCommentId: String) {
      createFeedComment(postId: $postId, content: $content, parentCommentId: $parentCommentId) {
        commentId
        postId
        content
        createdAt
        author {
          employeeId
          name
        }
      }
    }
  `,

  DELETE_FEED_COMMENT: `
    mutation DeleteFeedComment($commentId: ID!) {
      deleteFeedComment(commentId: $commentId)
    }
  `,

  TOGGLE_FEED_REACTION: `
    mutation ToggleFeedReaction($postId: ID!, $emoji: String!) {
      toggleFeedReaction(postId: $postId, emoji: $emoji) {
        action
        message
      }
    }
  `,

  TRACK_FEED_VIEW: `
    mutation TrackFeedView($postId: ID!) {
      trackFeedView(postId: $postId)
    }
  `,

  TOGGLE_FEED_SAVE: `
    mutation ToggleFeedSave($postId: ID!) {
      toggleFeedSave(postId: $postId) {
        action
        message
      }
    }
  `,

  CREATE_FEED_TOPIC: `
    mutation CreateFeedTopic($input: CreateFeedTopicInput!) {
      createFeedTopic(input: $input) {
        id
        topicName
        description
        icon
        displayOrder
      }
    }
  `,

  INIT_PERSONAL_TOPICS: `
    mutation InitPersonalTopics {
      initPersonalTopics {
        personalNotes {
          id
          topicName
          description
          icon
          isPersonal
          isSaved
        }
        savedPosts {
          id
          topicName
          description
          icon
          isPersonal
          isSaved
        }
      }
    }
  `,

  // Attendance Mutations
  SIGN_IN: `
    mutation SignIn {
      signIn {
        id
        signInTime
        status
        date
      }
    }
  `,

  SIGN_OUT: `
    mutation SignOut {
      signOut {
        id
        signInTime
        signOutTime
        workHours
        status
      }
    }
  `,

  REQUEST_MANUAL_ATTENDANCE: `
    mutation RequestManualAttendance($input: ManualAttendanceInput!) {
      requestManualAttendance(input: $input) {
        id
        date
        signInTime
        signOutTime
        isManualEntry
        approvalStatus
      }
    }
  `
}

