"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Calendar, ChevronRight, LayoutList, Rows3, Tag, Check, ChevronDown, Trash2, Search, X } from 'lucide-react';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';
import type { CurrentMeeting } from '@/components/Sidebar/SidebarProvider';
import { formatMeetingDate } from '@/lib/format-date';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/components/ConfirmationModel/confirmation-modal';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
}

// Mirror of the Rust `api_search_transcripts` result shape.
interface TranscriptSearchResult {
  id: string;
  title: string;
  matchContext: string;
  timestamp: string;
}

const UNCATEGORIZED = '__uncategorized__';

export default function MeetingsPage() {
  const router = useRouter();
  const { meetings, setCurrentMeeting, refetchMeetings } = useSidebar();

  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [grouped, setGrouped] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<TranscriptSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const list = await invoke<TemplateInfo[]>('api_list_templates');
      setTemplates(list);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Debounced full-text transcript search (same backend command the sidebar uses).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const results = await invoke<TranscriptSearchResult[]>('api_search_transcripts', { query: q });
        if (!cancelled) setSearchResults(results);
      } catch (error) {
        console.error('Failed to search transcripts:', error);
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  // Map template id -> display name for badges/labels.
  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    templates.forEach(t => map.set(t.id, t.name));
    return map;
  }, [templates]);

  const typeLabel = useCallback(
    (type?: string | null) => {
      if (!type) return 'Uncategorized';
      return typeNameById.get(type) ?? type;
    },
    [typeNameById],
  );

  // Only surface real meetings (exclude the transient "+ New Call" entry).
  const realMeetings = useMemo(
    () => meetings.filter(m => m.id && m.id !== 'intro-call'),
    [meetings],
  );

  // Type values that actually appear in the meetings list, for filter chips.
  const presentTypes = useMemo(() => {
    const set = new Set<string>();
    let hasUncategorized = false;
    realMeetings.forEach(m => {
      if (m.meetingType) set.add(m.meetingType);
      else hasUncategorized = true;
    });
    const ordered = Array.from(set).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
    if (hasUncategorized) ordered.push(UNCATEGORIZED);
    return ordered;
  }, [realMeetings, typeLabel]);

  // Meeting id -> transcript match (for showing the snippet + restricting results).
  const matchById = useMemo(() => {
    const map = new Map<string, TranscriptSearchResult>();
    searchResults.forEach(r => map.set(r.id, r));
    return map;
  }, [searchResults]);

  const isSearchActive = searchQuery.trim().length > 0;

  // When searching, restrict to meetings that match by transcript content or title.
  const searchedMeetings = useMemo(() => {
    if (!isSearchActive) return realMeetings;
    const q = searchQuery.trim().toLowerCase();
    return realMeetings.filter(
      m => matchById.has(m.id) || m.title.toLowerCase().includes(q),
    );
  }, [isSearchActive, realMeetings, matchById, searchQuery]);

  const filteredMeetings = useMemo(() => {
    if (typeFilter === 'all') return searchedMeetings;
    if (typeFilter === UNCATEGORIZED) return searchedMeetings.filter(m => !m.meetingType);
    return searchedMeetings.filter(m => m.meetingType === typeFilter);
  }, [searchedMeetings, typeFilter]);

  // Grouped view: sections keyed by type, each sorted by recency.
  const groupedMeetings = useMemo(() => {
    const groups = new Map<string, CurrentMeeting[]>();
    filteredMeetings.forEach(m => {
      const key = m.meetingType || UNCATEGORIZED;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    return Array.from(groups.entries()).sort((a, b) =>
      typeLabel(a[0] === UNCATEGORIZED ? null : a[0]).localeCompare(
        typeLabel(b[0] === UNCATEGORIZED ? null : b[0]),
      ),
    );
  }, [filteredMeetings, typeLabel]);

  const openMeeting = useCallback(
    (meeting: CurrentMeeting) => {
      setCurrentMeeting({ id: meeting.id, title: meeting.title });
      router.push(`/meeting-details?id=${meeting.id}`);
    },
    [router, setCurrentMeeting],
  );

  const assignType = useCallback(
    async (meetingId: string, type: string | null) => {
      try {
        await invoke('api_set_meeting_type', { meetingId, meetingType: type });
        await refetchMeetings();
      } catch (error) {
        console.error('Failed to set meeting type:', error);
        toast.error('Failed to update meeting type', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [refetchMeetings],
  );

  const handleDelete = useCallback(async () => {
    const id = deleteModal.id;
    setDeleteModal({ isOpen: false, id: null });
    if (!id) return;
    try {
      await invoke('api_delete_meeting', { meetingId: id });
      await refetchMeetings();
      toast.success('Meeting deleted');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error('Failed to delete meeting', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [deleteModal.id, refetchMeetings]);

  const renderRow = (meeting: CurrentMeeting) => (
    <div
      key={meeting.id}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-brand-eraser/30 transition-colors cursor-pointer"
      onClick={() => openMeeting(meeting)}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-body text-primary">
        <Calendar className="w-4 h-4" />
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-foreground line-clamp-2">{meeting.title}</span>
        <span className="text-xs text-muted-foreground">
          {meeting.createdAt ? formatMeetingDate(meeting.createdAt) : 'Date unavailable'}
        </span>
        {isSearchActive && matchById.get(meeting.id) && (
          <span className="mt-1 text-xs text-gray-500 line-clamp-2">
            <span className="font-medium text-yellow-600">Match:</span>{' '}
            {matchById.get(meeting.id)!.matchContext}
          </span>
        )}
      </div>

      {/* Inline type selector — assign/change the meeting type from the list */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 max-w-[180px]">
              <Tag className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{typeLabel(meeting.meetingType)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="flex items-center justify-between gap-2"
              onClick={() => assignType(meeting.id, null)}
            >
              <span>Uncategorized</span>
              {!meeting.meetingType && <Check className="w-4 h-4 text-green-600" />}
            </DropdownMenuItem>
            {templates.map(t => (
              <DropdownMenuItem
                key={t.id}
                className="flex items-center justify-between gap-2"
                onClick={() => assignType(meeting.id, t.id)}
                title={t.description}
              >
                <span>{t.name}</span>
                {meeting.meetingType === t.id && <Check className="w-4 h-4 text-green-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setDeleteModal({ isOpen: true, id: meeting.id });
        }}
        className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete meeting"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </div>
  );

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Fixed header - full-width and pinned to the true top of the window,
          so its empty space works as a Tauri drag region regardless of scroll
          position (matches the Settings page header). */}
      <div data-app-drag className="sticky top-0 z-10 flex-shrink-0 bg-background border-b border-border">
        <div data-app-drag className="max-w-3xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-foreground">All Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSearchActive
              ? `${filteredMeetings.length} ${filteredMeetings.length === 1 ? 'result' : 'results'}${isSearching ? '…' : ''}`
              : `${realMeetings.length} ${realMeetings.length === 1 ? 'meeting' : 'meetings'}`}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Search across meeting titles and full transcript text */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meeting titles and transcripts..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls: type filter + group toggle */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip label="All" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
            {presentTypes.map(type => (
              <FilterChip
                key={type}
                label={type === UNCATEGORIZED ? 'Uncategorized' : typeLabel(type)}
                active={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setGrouped(prev => !prev)}
            title={grouped ? 'Show as a flat list' : 'Group by meeting type'}
          >
            {grouped ? <LayoutList className="w-4 h-4" /> : <Rows3 className="w-4 h-4" />}
            <span>{grouped ? 'List view' : 'Group by type'}</span>
          </Button>
        </div>

        {/* List */}
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{isSearchActive ? 'No meetings match your search.' : 'No meetings to show.'}</p>
          </div>
        ) : grouped ? (
          <div className="space-y-6">
            {groupedMeetings.map(([type, items]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {type === UNCATEGORIZED ? 'Uncategorized' : typeLabel(type)}
                  </h2>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <div className="space-y-2">{items.map(renderRow)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{filteredMeetings.map(renderRow)}</div>
        )}
      </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        text="Are you sure you want to delete this meeting? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-brand-eraser/60'
      }`}
    >
      {label}
    </button>
  );
}
