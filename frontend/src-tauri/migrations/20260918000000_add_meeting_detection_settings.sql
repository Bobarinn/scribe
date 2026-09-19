-- Persisted toggles for automatic call detection (see meeting_detection.rs).
--  meetingDetectionEnabled:   detect started calls and prompt/record (default on).
--  meetingDetectionAutoStart: auto-start recording on app-launch detections (default off).
ALTER TABLE settings ADD COLUMN meetingDetectionEnabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN meetingDetectionAutoStart INTEGER NOT NULL DEFAULT 0;
