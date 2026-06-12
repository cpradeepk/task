-- Migration 043: Seed App Version and Maintenance Settings
-- Date: 2026-06-10
-- Description: Inserts default values for app version management if they do not exist.

INSERT INTO settings (key, value, description, created_by, is_active)
VALUES (
  'app_version_management',
  '{"minAndroidVersion": "1.0.0", "minIosVersion": "1.0.0", "androidUrl": "https://play.google.com/store/apps/details?id=com.karmayog", "iosUrl": "https://apps.apple.com/app/id123456789", "maintenanceMode": false}',
  'Application force update version thresholds, download URLs, and maintenance mode status',
  'system',
  true
)
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;
