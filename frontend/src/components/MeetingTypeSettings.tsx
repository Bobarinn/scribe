'use client';

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
}

type Schedules = Record<string, string>;

/**
 * Manage meeting types (templates): create/delete custom types and attach an
 * approximate time of day to any type. When a recording starts within ~10
 * minutes of a type's time, that type is auto-selected for the meeting.
 */
export function MeetingTypeSettings() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [schedules, setSchedules] = useState<Schedules>({});
  const [newTypeName, setNewTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, sched] = await Promise.all([
        invoke<TemplateInfo[]>('api_list_templates'),
        invoke<Schedules>('api_get_template_schedules'),
      ]);
      setTemplates(list);
      setSchedules(sched);
    } catch (error) {
      console.error('Failed to load meeting types:', error);
      toast.error('Failed to load meeting types');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTime = useCallback(
    async (id: string, time: string) => {
      // Optimistic update so the input stays responsive.
      setSchedules(prev => {
        const next = { ...prev };
        if (time) next[id] = time;
        else delete next[id];
        return next;
      });
      try {
        await invoke('api_set_template_schedule', {
          templateId: id,
          timeOfDay: time || null,
        });
      } catch (error) {
        console.error('Failed to save template time:', error);
        toast.error('Failed to save time');
        refresh();
      }
    },
    [refresh],
  );

  const createType = useCallback(async () => {
    const name = newTypeName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      await invoke<string>('api_create_custom_template', { name });
      setNewTypeName('');
      toast.success(`Added meeting type "${name}"`);
      await refresh();
    } catch (error) {
      console.error('Failed to create meeting type:', error);
      toast.error('Failed to create meeting type', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsCreating(false);
    }
  }, [newTypeName, refresh]);

  const deleteType = useCallback(
    async (id: string, name: string) => {
      try {
        await invoke('api_delete_custom_template', { templateId: id });
        toast.success(`Deleted "${name}"`);
        await refresh();
      } catch (error) {
        console.error('Failed to delete meeting type:', error);
        toast.error('Failed to delete meeting type', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [refresh],
  );

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Meeting types &amp; schedules</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Create custom meeting types to group and filter your notes, and give any type an
          approximate time of day. When a recording starts within ~10 minutes of a type&apos;s
          time, that type is selected automatically.
        </p>
      </div>

      {/* Create a new custom type */}
      <div className="flex items-center gap-2 max-w-md">
        <Input
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createType();
          }}
          placeholder="New meeting type (e.g. Sprint Planning)"
        />
        <Button onClick={createType} disabled={!newTypeName.trim() || isCreating} className="gap-1.5 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Template list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-body text-primary">
                <Tag className="w-4 h-4" />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-foreground truncate">
                  {template.name}
                  {template.isCustom && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1 py-0.5">
                      custom
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground truncate">{template.description}</span>
              </div>

              {/* Approximate time of day */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <input
                  type="time"
                  value={schedules[template.id] ?? ''}
                  onChange={(e) => setTime(template.id, e.target.value)}
                  className="rounded-md border border-border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label={`Approximate time for ${template.name}`}
                />
                {schedules[template.id] && (
                  <button
                    onClick={() => setTime(template.id, '')}
                    className="text-xs text-muted-foreground hover:text-foreground px-1"
                    title="Clear time"
                  >
                    Clear
                  </button>
                )}
              </div>

              {template.isCustom ? (
                <button
                  onClick={() => deleteType(template.id, template.name)}
                  className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  aria-label={`Delete ${template.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="w-8 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
