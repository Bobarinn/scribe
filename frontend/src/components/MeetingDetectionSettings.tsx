'use client';

import { useCallback, useEffect, useState } from 'react';
import { Radar } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface DetectionSettings {
  enabled: boolean;
  autoStart: boolean;
}

/**
 * Toggles for automatic call detection, persisted in the DB via
 * api_get/save_meeting_detection_settings and read by the global
 * CallDetectionPrompt at event time.
 */
export function MeetingDetectionSettings() {
  const [enabled, setEnabled] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const settings = await invoke<DetectionSettings>('api_get_meeting_detection_settings');
        setEnabled(settings.enabled);
        setAutoStart(settings.autoStart);
      } catch (error) {
        console.error('Failed to load detection settings:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (nextEnabled: boolean, nextAutoStart: boolean) => {
    try {
      await invoke('api_save_meeting_detection_settings', {
        enabled: nextEnabled,
        autoStart: nextAutoStart,
      });
    } catch (error) {
      console.error('Failed to save detection settings:', error);
      toast.error('Failed to save detection settings');
    }
  }, []);

  const updateEnabled = (value: boolean) => {
    setEnabled(value);
    persist(value, autoStart);
  };

  const updateAutoStart = (value: boolean) => {
    setAutoStart(value);
    persist(enabled, value);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Automatic call detection</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Scribe can offer to record when a call starts. It detects known call apps launching
        (Zoom, Webex, FaceTime) and, more broadly, when the microphone becomes active — which
        also covers Teams, Slack and browser-based Google Meet.
      </p>

      <label
        className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-border cursor-pointer ${
          isLoading ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Detect started calls</p>
          <p className="text-xs text-muted-foreground">Show a prompt at the bottom-right when a call is detected.</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => updateEnabled(e.target.checked)}
          className="h-4 w-4 accent-primary flex-shrink-0"
        />
      </label>

      <label
        className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-border cursor-pointer ${
          enabled && !isLoading ? '' : 'opacity-50 pointer-events-none'
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Auto-start recording</p>
          <p className="text-xs text-muted-foreground">
            Begin recording automatically when a known call app launches (Zoom/Webex/FaceTime).
            The broader microphone signal always prompts first.
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoStart}
          onChange={(e) => updateAutoStart(e.target.checked)}
          className="h-4 w-4 accent-primary flex-shrink-0"
        />
      </label>
    </div>
  );
}
