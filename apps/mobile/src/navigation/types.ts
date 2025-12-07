/**
 * Navigation Types
 */

export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    TaskList: undefined;
    TaskDetails: { taskId: string };
    BugList: undefined;
    BugDetails: { bugId: string };
    CreateBug: undefined;
    CreateTask: undefined;
    FeedPostDetails: { postId: string };
    CreateFeedPost: undefined;
    Notifications: undefined;
    LeaveList: undefined;
    LeaveDetails: { leaveId: string };
    CreateLeave: undefined;
    WFHList: undefined;
    WFHDetails: { wfhId: string };
    CreateWFH: undefined;
    AttendanceDashboard: undefined;
    Settings: undefined;
    Feed: undefined;
};
