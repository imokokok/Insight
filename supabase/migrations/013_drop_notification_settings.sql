-- 013_drop_notification_settings.sql
-- Drop notification_settings column from user_profiles since the notification feature was removed

ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS notification_settings;
