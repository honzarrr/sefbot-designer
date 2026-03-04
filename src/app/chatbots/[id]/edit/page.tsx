'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchChatbot,
  createStep,
  updateStep,
  deleteStep,
  duplicateStep,
  reorderSteps,
  bulkColorSteps,
  createVersion,
} from '@/lib/chatbot-api';
import { ChatbotData, ChatbotStepData, OutputBlock, StepInput, JumpRule } from '@/types/chatbot';
import { StepList } from '@/components/chatbot/StepList';
import { OutputEditor } from '@/components/chatbot/OutputEditor';
import { InputEditor } from '@/components/chatbot/InputEditor';
import { JumpEditor } from '@/components/chatbot/JumpEditor';
import { SettingsEditor } from '@/components/chatbot/SettingsEditor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, AlertCircle, Link2, CheckCircle } from 'lucide-react';

export default function ChatbotEditPage() {
  const params = useParams() ?? {};
  const chatbotId = (params?.id as string) || '';

  const [chatbot, setChatbot] = useState<ChatbotData | null>(null);
  const [steps, setSteps] = useState<ChatbotStepData[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadChatbot = useCallback(async () => {
    try {
      const data = await fetchChatbot(chatbotId);
      setChatbot(data);
      setSteps(data.steps);
      if (data.steps.length > 0 && !selectedStepId) {
        setSelectedStepId(data.steps[0].id);
      }
    } catch (e) {
      console.error('Failed to load chatbot:', e);
    } finally {
      setLoading(false);
    }
  }, [chatbotId, selectedStepId]);

  useEffect(() => {
    loadChatbot();
  }, [chatbotId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;

  // === Step operations ===
  const handleAddStep = async (type: string) => {
    try {
      const step = await createStep(chatbotId, {
        name: `Step ${steps.length + 1}`,
        type,
      });
      setSteps((prev) => [...prev, step]);
      setSelectedStepId(step.id);
      setDirty(true);
    } catch (e) {
      console.error('Failed to create step:', e);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteStep(chatbotId, stepId);
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
      if (selectedStepId === stepId) {
        setSelectedStepId(steps.find((s) => s.id !== stepId)?.id || null);
      }
      setSelectedStepIds((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
      setDirty(true);
    } catch (e) {
      console.error('Failed to delete step:', e);
    }
  };

  const handleDuplicateStep = async (stepId: string) => {
    try {
      const step = await duplicateStep(chatbotId, stepId);
      setSteps((prev) => [...prev, step]);
      setDirty(true);
    } catch (e) {
      console.error('Failed to duplicate step:', e);
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const next = [...steps];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    const order = next.map((s, i) => ({ id: s.id, sortOrder: i }));
    setSteps(next);

    try {
      await reorderSteps(chatbotId, order);
      setDirty(true);
    } catch (e) {
      console.error('Failed to reorder:', e);
      loadChatbot();
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<ChatbotStepData>) => {
    // Optimistic update
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
    setDirty(true);

    try {
      await updateStep(chatbotId, stepId, updates);
    } catch (e) {
      console.error('Failed to update step:', e);
    }
  };

  // === Bulk operations ===
  const handleToggleSelect = (stepId: string) => {
    setSelectedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedStepIds(new Set(steps.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStepIds(new Set());
  };

  const handleBulkColor = async (color: string) => {
    const ids = Array.from(selectedStepIds);
    setSteps((prev) =>
      prev.map((s) => (selectedStepIds.has(s.id) ? { ...s, color } : s))
    );
    try {
      await bulkColorSteps(chatbotId, ids, color);
      setDirty(true);
    } catch (e) {
      console.error('Failed to bulk color:', e);
    }
    setSelectedStepIds(new Set());
  };

  const handleBulkDuplicate = async () => {
    const ids = Array.from(selectedStepIds);
    for (let i = 0; i < ids.length; i++) {
      await handleDuplicateStep(ids[i]);
    }
    setSelectedStepIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedStepIds);
    for (let i = 0; i < ids.length; i++) {
      await handleDeleteStep(ids[i]);
    }
    setSelectedStepIds(new Set());
  };

  // === Save & validation ===
  const validate = (): string[] => {
    const errors: string[] = [];
    steps.forEach((step) => {
      if (!step.name.trim()) {
        errors.push(`Step ${step.number} has no name`);
      }
      step.jump.forEach((rule) => {
        if (rule.target !== 'exit' && rule.target !== 'url') {
          const targetStep = steps.find((s) => s.id === rule.target);
          if (!targetStep) {
            errors.push(`Step ${step.number}: jump rule points to missing step`);
          }
        }
      });
    });
    return errors;
  };

  const handleSave = async () => {
    const errors = validate();
    setValidationErrors(errors);

    if (errors.length > 0) {
      setSaveStatus('error');
      return;
    }

    setSaving(true);
    try {
      // Auto-version on save
      await createVersion(chatbotId, 'Auto-save');
      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error('Failed to save:', e);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // === Output/Input/Jump/Settings updates ===
  const handleOutputChange = (blocks: OutputBlock[]) => {
    if (!selectedStep) return;
    handleUpdateStep(selectedStep.id, { output: blocks });
  };

  const handleInputChange = (input: StepInput) => {
    if (!selectedStep) return;
    handleUpdateStep(selectedStep.id, { input });
  };

  const handleJumpChange = (jump: JumpRule[]) => {
    if (!selectedStep) return;
    handleUpdateStep(selectedStep.id, { jump });
  };

  const handleStepSettingsChange = (updates: Partial<ChatbotStepData>) => {
    if (!selectedStep) return;
    handleUpdateStep(selectedStep.id, updates);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel: Step list */}
      <StepList
        steps={steps}
        selectedStepId={selectedStepId}
        selectedStepIds={selectedStepIds}
        onSelectStep={setSelectedStepId}
        onToggleSelect={handleToggleSelect}
        onAddStep={handleAddStep}
        onDuplicateStep={handleDuplicateStep}
        onDeleteStep={handleDeleteStep}
        onReorder={handleReorder}
        onBulkColor={handleBulkColor}
        onBulkDuplicate={handleBulkDuplicate}
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      {/* Center panel: Step detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Save bar */}
        <div className="px-4 py-2 border-b flex items-center gap-3">
          {chatbot?.projectId && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              <Link2 className="h-3 w-3" />
              Linked to designer project
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {validationErrors.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved
              </div>
            )}
            {dirty && (
              <Badge variant="outline" className="text-xs text-amber-600">
                Unsaved
              </Badge>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/10 border-b">
            <ul className="text-xs text-destructive space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Step editor tabs */}
        {selectedStep ? (
          <ScrollArea className="flex-1">
            <div className="p-4">
              <Tabs defaultValue="output" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="jump">Jump</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="output">
                  <OutputEditor
                    blocks={selectedStep.output}
                    onChange={handleOutputChange}
                  />
                </TabsContent>

                <TabsContent value="input">
                  <InputEditor
                    stepType={selectedStep.type}
                    input={selectedStep.input}
                    onChange={handleInputChange}
                  />
                </TabsContent>

                <TabsContent value="jump">
                  <JumpEditor
                    rules={selectedStep.jump}
                    steps={steps}
                    onChange={handleJumpChange}
                  />
                </TabsContent>

                <TabsContent value="settings">
                  <SettingsEditor
                    step={selectedStep}
                    onUpdate={handleStepSettingsChange}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Select a step to edit</p>
              <p className="text-xs mt-1">or add a new step from the left panel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
