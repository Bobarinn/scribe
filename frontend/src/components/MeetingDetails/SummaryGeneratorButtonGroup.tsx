"use client";

import { ModelConfig, ModelSettingsModal } from '@/components/ModelSettingsModal';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sparkles, Settings, Loader2, FileText, Check, Square, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect, ReactNode } from 'react';

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
}

interface SummaryGeneratorButtonGroupProps {
  languageSlot?: ReactNode;
  modelConfig: ModelConfig;
  setModelConfig: (config: ModelConfig | ((prev: ModelConfig) => ModelConfig)) => void;
  onSaveModelConfig: (config?: ModelConfig) => Promise<void>;
  onGenerateSummary: (customPrompt: string) => Promise<void>;
  onStopGeneration: () => void;
  customPrompt: string;
  summaryStatus: 'idle' | 'processing' | 'summarizing' | 'regenerating' | 'completed' | 'error';
  availableTemplates: TemplateOption[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string, templateName: string) => void;
  onCreateCustomType?: (name: string) => Promise<string | null>;
  onDeleteCustomType?: (templateId: string) => Promise<boolean>;
  hasTranscripts?: boolean;
  hasSummary?: boolean;
  isModelConfigLoading?: boolean;
  onOpenModelSettings?: (openFn: () => void) => void;
}

export function SummaryGeneratorButtonGroup({
  modelConfig,
  setModelConfig,
  onSaveModelConfig,
  onGenerateSummary,
  onStopGeneration,
  customPrompt,
  summaryStatus,
  availableTemplates,
  selectedTemplate,
  onTemplateSelect,
  onCreateCustomType,
  onDeleteCustomType,
  hasTranscripts = true,
  hasSummary = false,
  isModelConfigLoading = false,
  onOpenModelSettings,
  languageSlot
}: SummaryGeneratorButtonGroupProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isCreatingType, setIsCreatingType] = useState(false);

  const handleCreateType = async () => {
    if (!onCreateCustomType) return;
    const name = newTypeName.trim();
    if (!name) return;
    setIsCreatingType(true);
    try {
      const newId = await onCreateCustomType(name);
      if (newId) {
        onTemplateSelect(newId, name);
        setNewTypeName('');
        setCreateTypeDialogOpen(false);
      }
    } finally {
      setIsCreatingType(false);
    }
  };

  // Expose the function to open the modal via callback registration
  useEffect(() => {
    if (onOpenModelSettings) {
      // Register our open dialog function with the parent by calling the callback
      // This allows the parent to store a reference to this function
      const openDialog = () => {
        console.log('📱 Opening model settings dialog via callback');
        setSettingsDialogOpen(true);
      };

      // Call the parent's callback with our open function
      // Note: This assumes onOpenModelSettings accepts a function parameter
      // We'll need to adjust the signature
      onOpenModelSettings(openDialog);
    }
  }, [onOpenModelSettings]);

  if (!hasTranscripts) {
    return null;
  }

  const isGenerating = summaryStatus === 'processing' || summaryStatus === 'summarizing' || summaryStatus === 'regenerating';

  return (
    <ButtonGroup>
      {/* Generate Summary or Stop button */}
      {isGenerating ? (
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border-red-200 px-3 gap-2"
          onClick={() => {
            onStopGeneration();
          }}
          title="Stop summary generation"
        >
          <Square size={18} fill="currentColor" />
          <span className="hidden @[24rem]:inline">Stop</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="bg-gradient-to-r from-brand-eraser to-brand-body hover:from-brand-eraser hover:to-brand-side border-brand-coral/30 shadow-[0_1px_10px_rgba(249,66,74,0.22)] hover:shadow-[0_2px_16px_rgba(249,66,74,0.32)] transition-shadow px-3 gap-2"
          onClick={() => {
            void onGenerateSummary(customPrompt);
          }}
          disabled={isModelConfigLoading}
          title={
            isModelConfigLoading
              ? 'Loading model configuration...'
              : hasSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'
          }
        >
          {isModelConfigLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span className="hidden @[24rem]:inline">Processing...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span className="hidden @[24rem]:inline">{hasSummary ? 'Regenerate Summary' : 'Generate Summary'}</span>
            </>
          )}
        </Button>
      )}

      {languageSlot}

      {/* Settings button */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Summary Settings"
          >
            <Settings />
            <span className="hidden @[40rem]:inline">AI Model</span>
          </Button>
        </DialogTrigger>
        <DialogContent
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogTitle>Model Settings</DialogTitle>
          </VisuallyHidden>
          <ModelSettingsModal
            onSave={async (config) => {
              await onSaveModelConfig(config);
              setSettingsDialogOpen(false);
            }}
            modelConfig={modelConfig}
            setModelConfig={setModelConfig}
            skipInitialFetch={true}
            layout="dialog"
          />
        </DialogContent>
      </Dialog>

      {/* Template selector dropdown */}
      {availableTemplates.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              title="Select summary template / meeting type"
            >
              <FileText />
              <span className="hidden @[40rem]:inline">Template</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            {availableTemplates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => onTemplateSelect(template.id, template.name)}
                title={template.description}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{template.name}</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  {selectedTemplate === template.id && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  {template.isCustom && onDeleteCustomType && (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Delete this custom type"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        void onDeleteCustomType(template.id);
                      }}
                      className="p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            ))}

            {onCreateCustomType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreateTypeDialogOpen(true);
                  }}
                  className="flex items-center gap-2 text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>New meeting type…</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create custom meeting type dialog */}
      <Dialog open={createTypeDialogOpen} onOpenChange={setCreateTypeDialogOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[420px]">
          <DialogTitle>New meeting type</DialogTitle>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a custom type to group and filter your meetings. It uses the standard
              summary format.
            </p>
            <Input
              autoFocus
              placeholder="e.g. Client Call, 1:1, Interview"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateType();
                }
              }}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateTypeDialogOpen(false);
                  setNewTypeName('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleCreateType()}
                disabled={!newTypeName.trim() || isCreatingType}
              >
                {isCreatingType ? <Loader2 className="animate-spin" size={16} /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ButtonGroup>
  );
}
