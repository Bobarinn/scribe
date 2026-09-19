import { useState, useEffect, useCallback } from 'react';
import { invoke as invokeTauri } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
}

const DEFAULT_TEMPLATE_ID = 'standard_meeting';

export function useTemplates(initialTemplateId?: string | null) {
  const [availableTemplates, setAvailableTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    initialTemplateId || DEFAULT_TEMPLATE_ID,
  );

  const fetchTemplates = useCallback(async () => {
    try {
      const templates = await invokeTauri<TemplateInfo[]>('api_list_templates');
      setAvailableTemplates(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, []);

  // Fetch available templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Keep the selected template in sync with the meeting's persisted type once it
  // becomes available (e.g. after the meetings list loads).
  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplate(initialTemplateId);
    }
  }, [initialTemplateId]);

  // Handle template selection
  const handleTemplateSelection = useCallback((templateId: string, templateName: string) => {
    setSelectedTemplate(templateId);
    toast.success('Template selected', {
      description: `Using "${templateName}" template for summary generation`,
    });
  }, []);

  // Create a new custom meeting type (maps to the standard summary format).
  const createCustomType = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Type name cannot be empty');
        return null;
      }
      try {
        const id = await invokeTauri<string>('api_create_custom_template', { name: trimmed });
        await fetchTemplates();
        toast.success('Meeting type created', { description: `"${trimmed}" is ready to use` });
        return id;
      } catch (error) {
        console.error('Failed to create custom type:', error);
        toast.error('Failed to create meeting type', {
          description: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [fetchTemplates],
  );

  // Delete a user-created custom meeting type.
  const deleteCustomType = useCallback(
    async (templateId: string): Promise<boolean> => {
      try {
        await invokeTauri('api_delete_custom_template', { templateId });
        await fetchTemplates();
        setSelectedTemplate(prev => (prev === templateId ? DEFAULT_TEMPLATE_ID : prev));
        toast.success('Meeting type deleted');
        return true;
      } catch (error) {
        console.error('Failed to delete custom type:', error);
        toast.error('Failed to delete meeting type', {
          description: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [fetchTemplates],
  );

  return {
    availableTemplates,
    selectedTemplate,
    setSelectedTemplate,
    handleTemplateSelection,
    createCustomType,
    deleteCustomType,
    refreshTemplates: fetchTemplates,
  };
}
