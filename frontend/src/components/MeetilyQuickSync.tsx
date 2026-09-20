'use client';

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';

/**
 * Temporary manual trigger for the Meetily -> Scribe meeting sync (the app
 * already does this quietly on every launch - this is just a one-off "do it
 * now" button for testing). Small and self-contained so it's easy to remove
 * later; delete this file and its one usage in settings/page.tsx.
 */
export function MeetilyQuickSync() {
  const { refetchMeetings } = useSidebar();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const detection = await invoke<{ dbPath: string; newMeetings: number } | null>(
        'check_for_meetily_data'
      );
      if (!detection) {
        toast('No existing Meetily installation found on this machine.');
        return;
      }
      if (detection.newMeetings === 0) {
        toast.success('Already up to date with Meetily.');
        return;
      }
      const result = await invoke<{ importedMeetings: number; audioMissing: number }>(
        'import_meetily_data',
        { dbPath: detection.dbPath }
      );
      toast.success(
        `Imported ${result.importedMeetings} meeting${result.importedMeetings === 1 ? '' : 's'} from Meetily` +
        (result.audioMissing > 0 ? ` (${result.audioMissing} recording(s) missing)` : '')
      );
      await refetchMeetings();
    } catch (error) {
      console.error('Meetily sync failed:', error);
      toast.error('Meetily sync failed - see console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50 inline-flex items-center gap-1"
    >
      {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      Sync Meetily now
    </button>
  );
}
