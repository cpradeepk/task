-- Add minimum hours for full attendance setting
INSERT INTO settings (setting_key, setting_value, category, description, value_type, is_editable, display_order)
VALUES (
  'minimum_hours_for_full_attendance',
  '3',
  'attendance',
  'Minimum hours required for full attendance (less than this shows as Partial Leave)',
  'number',
  1,
  100
)
ON CONFLICT (setting_key) DO NOTHING;
