'use client';

import { useCallback, useEffect, useState } from 'react';
import { Import, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';

interface MeetilyDetection {
  dbPath: string;
  totalMeetings: number;
  newMeetings: number;
}

interface MeetilyImportResult {
  importedMeetings: number;
  skippedExisting: number;
  audioCopied: number;
  audioMissing: number;
}

/**
 * Detects an existing Meetily installation on this machine (same schema,
 * different app identity) and offers to copy its meetings - transcripts,
 * notes, summaries, and recording audio - into Scribe.
 */
export function MeetilySyncSettings() {
  const { refetchMeetings } = useSidebar();
  const [detection, setDetection] = useState<MeetilyDetection | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await invoke<MeetilyDetection | null>('check_for_meetily_data');
      setDetection(result);
    } catch (error) {
      console.error('Failed to check for an existing Meetily installation:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const runImport = async (dbPath: string) => {
    setIsImporting(true);
    try {
      const result = await invoke<MeetilyImportResult>('import_meetily_data', { dbPath });
      if (result.importedMeetings === 0) {
        toast.success('Nothing new to import - already up to date.');
      } else {
        const audioNote = result.audioMissing > 0
          ? ` (${result.audioMissing} recording${result.audioMissing === 1 ? '' : 's'} could not be found)`
          : '';
        toast.success(
          `Imported ${result.importedMeetings} meeting${result.importedMeetings === 1 ? '' : 's'} from Meetily${audioNote}`
        );
      }
      await refetchMeetings();
      await runCheck();
    } catch (error) {
      console.error('Failed to import from Meetily:', error);
      toast.error('Failed to import from Meetily. See the console for details.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectManually = async () => {
    try {
      const path = await invoke<string | null>('select_meetily_database_path');
      if (path) {
        await runImport(path);
      }
    } catch (error) {
      console.error('Failed to select a Meetily database:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Import className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Import from Meetily</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        If this machine also has the original Meetily app installed, Scribe can copy its
        meetings - transcripts, notes, summaries, and recordings - into your Scribe library.
        Nothing is removed from Meetily, and meetings already in Scribe are skipped.
      </p>

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border">
        <div className="min-w-0 flex-1">
          {isChecking ? (
            <p className="text-sm text-muted-foreground">Checking for an existing Meetily installation...</p>
          ) : detection ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Found Meetily with {detection.totalMeetings} meeting{detection.totalMeetings === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                {detection.newMeetings > 0
                  ? `${detection.newMeetings} not yet in Scribe`
                  : 'Everything is already imported'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No existing Meetily installation found on this machine.</p>
          )}
        </div>

        {detection && detection.newMeetings > 0 && (
          <Button size="sm" disabled={isImporting} onClick={() => runImport(detection.dbPath)}>
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-4 h-4" />}
            {isImporting ? 'Importing...' : `Import ${detection.newMeetings}`}
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={handleSelectManually}
        disabled={isImporting}
        className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
      >
        Select a Meetily database file manually...
      </button>
    </div>
  );
}
