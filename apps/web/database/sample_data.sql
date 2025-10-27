-- ============================================================================
-- JSR Task Management System - Sample Data
-- ============================================================================
-- Description: Sample data extracted from Google Sheets HTML files
-- ============================================================================

-- Insert sample users
INSERT INTO users (employee_id, name, email, phone, telegram_token, department, manager_email, manager_id, is_today_task, warning_count, role, password, status, created_at, updated_at) VALUES
('AM-0001', 'Pradeep Chandrasekar', 'mailcpk@gmail.com', '9739765567', '', 'Founder', '', NULL, FALSE, 0, 'top_management', '1234', 'active', '2025-06-20T05:17:11.672Z', '2025-06-20T05:17:11.672Z'),
('AM-0002', 'Agasti Sri Chandra Lekha', 'srichandralekhaagasti@gmail.com', '9322249396', '', 'Finance', 'vikasmahesh@eassy.life', 'AM-0001', FALSE, 0, 'top_management', '1234', 'active', '2025-06-20T05:37:02.057Z', '2025-06-20T05:38:28.440Z'),
('AM-0003', 'Amtariksha Master JSR', 'publisher@eassy.life', '', '', 'Operations', 'pradeep@eassylife.in', 'AM-0001', FALSE, 0, 'employee', '1234', 'active', '2025-06-20T08:31:21.169Z', '2025-06-20T08:31:21.169Z'),
('AM-0004', 'Keval Shah', 'keval@eassylife.in', '9879246691', '', 'Frontend - Flutter', 'pradeep@eassylife.in', 'AM-0001', FALSE, 76, 'employee', '1234', 'active', '2025-06-20T15:35:26.088Z', '2025-09-30T13:37:32.921Z');

-- Insert sample tasks
INSERT INTO tasks (internal_id, task_id, select_type, recursive_type, description, assigned_to, assigned_by, support, start_date, end_date, priority, estimated_hours, actual_hours, daily_hours, status, remarks, difficulties, sub_task, created_at, updated_at) VALUES
('mf3tf6hx0czycfp71xwt', 'JSR-1756894160168886', 'Normal', NULL, 'working on Deep Link for Dub.co', 'AM-0001', 'AM-0001', '[]', '2025-09-03', '2025-09-30', 'U&I', 100, 36, '{"2025-09-03":1,"2025-09-04":6,"2025-09-11":6,"2025-09-12":9,"2025-09-15":10,"2025-09-23":4}', 'Done', '', '', '', '2025-09-03T10:09:20.805Z', '2025-09-25T12:00:32.458Z'),
('mf3tfsy01xc1am2y0smh', 'JSR-1756894189639325', 'Normal', NULL, 'work on task list creation with deadline', 'AM-0002', 'AM-0001', '[]', '2025-09-03', '2025-09-03', 'U&I', 6, 9, '{"2025-09-03":9}', 'Done', '', '', '', '2025-09-03T10:09:49.896Z', '2025-09-03T10:48:00.390Z'),
('mf6i52i6nu2ckbkfve8', 'JSR-1757056611003866', 'Normal', NULL, 'B2B Ops and CRM', 'AM-0003', 'AM-0001', '["AM-0001"]', '2025-09-05', '2025-09-05', 'U&I', 9, 0, '{}', 'Yet to Start', '', '', '', '2025-09-05T07:16:51.822Z', '2025-09-05T07:17:08.887Z'),
('mf6i532tjssg36rkfb', 'JSR-1757056611780630', 'Normal', NULL, '[SUPPORT] B2B Ops and CRM', 'AM-0004', 'AM-0001', '[]', '2025-09-05', '2025-09-05', 'U&I', 0, 0, '{}', 'Yet to Start', 'Support task for main task: JSR-1757056611003866', '', 'Support for: JSR-1757056611003866', '2025-09-05T07:16:52.565Z', '2025-09-05T07:16:52.565Z'),
('mf7ndeo663r8oxkyhme', 'JSR-1757125864183941', 'Normal', NULL, 'working on video play quizz', 'AM-0001', 'AM-0001', '[]', '2025-09-06', '2025-09-06', 'U&I', 8, 0, '{}', 'Yet to Start', '', '', '', '2025-09-06T02:31:05.094Z', '2025-09-06T02:31:05.094Z');

-- Insert sample WFH applications
INSERT INTO wfh_applications (application_id, employee_id, employee_name, wfh_type, reason, from_date, to_date, work_location, available_from, available_to, contact_number, status, manager_id, approved_by, approval_date, approval_remarks, created_at, updated_at) VALUES
('mcoftnlepx7i90uydp', 'AM-0004', 'Keval Shah', 'Full Day', 'sick new', '2025-07-04', '2025-07-04', 'Home', NULL, NULL, '9879246691', 'Rejected', 'AM-0001', 'AM-0001', '2025-07-04T07:25:19.696Z', 'testing 1', '2025-07-04T06:32:44.210Z', '2025-07-04T07:25:19.696Z'),
('mcogl2p971bm8nkqyjn', 'AM-0004', 'Keval Shah', 'Full Day', 'testing demo', '2025-07-04', '2025-07-04', 'ome', NULL, NULL, '9879246691', 'Approved', 'AM-0001', 'AM-0001', '2025-07-04T07:25:38.512Z', 'testing home 2', '2025-07-04T06:54:03.501Z', '2025-07-04T07:25:38.512Z'),
('mcoho9tt828m2kb1aiw', 'AM-0004', 'Keval Shah', 'Full Day', 'testing new', '2025-07-04', '2025-07-04', 'home', NULL, NULL, '9879246691', 'Rejected', 'AM-0001', 'AM-0001', '2025-07-04T07:25:54.635Z', 'ererere', '2025-07-04T07:24:32.321Z', '2025-07-04T07:25:54.635Z');

-- Insert sample bugs
INSERT INTO bugs (bug_id, title, description, severity, priority, status, category, platform, assigned_to, assigned_by, reported_by, environment, browser_info, device_info, steps_to_reproduce, expected_behavior, actual_behavior, attachments, estimated_hours, actual_hours, resolved_date, closed_date, reopened_count, tags, related_bugs, created_at, updated_at) VALUES
('BUG-1760432014426971', 'Test Bug', 'This is a test bug to verify the system is working', 'Minor', 'Low', 'New', 'Other', 'Web', NULL, NULL, 'AM-0001', 'Development', '', '', '', '', '', '', NULL, NULL, NULL, NULL, 0, '', '', '2025-10-14T08:53:34.426Z', '2025-10-14T08:53:34.426Z'),
('BUG-1760438594545659', 'Navigation Bug', 'Bug tracking navigation is not visible to all users', 'Major', 'High', 'New', 'UI', 'Web', 'AM-0002', NULL, 'AM-0001', 'Production', '', '', '', '', '', '', NULL, NULL, NULL, NULL, 0, '', '', '2025-10-14T10:43:14.545Z', '2025-10-14T10:43:14.545Z');

-- Insert sample bug comments
INSERT INTO bug_comments (bug_id, commented_by, comment_text, timestamp) VALUES
('BUG-1760432014426971', 'AM-0001', 'This is a test comment to verify the system is working', '2025-10-14T09:00:00.000Z'),
('BUG-1760438594545659', 'AM-0002', 'Working on fixing this navigation issue', '2025-10-14T11:00:00.000Z');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Count records in each table
-- SELECT 'users' as table_name, COUNT(*) as count FROM users
-- UNION ALL
-- SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL
-- SELECT 'leave_applications', COUNT(*) FROM leave_applications
-- UNION ALL
-- SELECT 'wfh_applications', COUNT(*) FROM wfh_applications
-- UNION ALL
-- SELECT 'bugs', COUNT(*) FROM bugs
-- UNION ALL
-- SELECT 'bug_comments', COUNT(*) FROM bug_comments;

