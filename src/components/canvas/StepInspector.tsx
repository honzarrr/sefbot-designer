'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StepData {
  id: string;
  name: string;
  type: string;
  output: { text?: string; imageUrl?: string; typingDelay?: number };
  input: { type?: string; placeholder?: string; options?: { label: string; value: string }[]; validation?: { required?: boolean; pattern?: string } };
  jump: { targetStepId: string; buttonLabel?: string; isDefault?: boolean; condition?: { variable: string; operator: string; value: string } }[];
  settings: { skipLogic?: string; delayMs?: number; typingIndicator?: boolean };
}

export function StepInspector() {
  const project = useDesignerStore((s) => s.project);
  const selectedIds = useDesignerStore((s) => s.selectedIds);
  const canvasMode = useDesignerStore((s) => s.canvasMode);

  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSteps, setAllSteps] = useState<{ id: string; name: string }[]>([]);

  // Only show in development mode with a selected step
  const selectedStepId = selectedIds.length === 1 ? selectedIds[0] : null;
  const isStep = selectedStepId && project?.steps.some((s) => s.id === selectedStepId);

  // Load step data
  useEffect(() => {
    if (!project || !selectedStepId || !isStep || canvasMode !== 'development') {
      setStepData(null);
      return;
    }

    const loadStepData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${project.id}/steps`);
        if (res.ok) {
          const steps = await res.json();
          setAllSteps(steps.map((s: StepData) => ({ id: s.id, name: s.name })));
          const step = steps.find((s: StepData) => {
            // Match by sourceBlockId
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return s.id === selectedStepId || (s as any).sourceBlockId === selectedStepId;
          });
          if (step) setStepData(step);
        }
      } catch (err) {
        console.error('Failed to load step:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStepData();
  }, [project, selectedStepId, isStep, canvasMode]);

  const saveStep = useCallback(async (updates: Partial<StepData>) => {
    if (!project || !stepData) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/steps/${stepData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setStepData(updated);
      }
    } catch (err) {
      console.error('Failed to save step:', err);
    } finally {
      setSaving(false);
    }
  }, [project, stepData]);

  if (canvasMode !== 'development' || !isStep || !stepData) return null;

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading step data...</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">{stepData.name}</h3>
        <p className="text-xs text-muted-foreground">Type: {stepData.type}</p>
      </div>

      <Tabs defaultValue="output" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="output" className="text-xs">Output</TabsTrigger>
          <TabsTrigger value="input" className="text-xs">Input</TabsTrigger>
          <TabsTrigger value="jump" className="text-xs">Jump</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <TabsContent value="output" className="mt-0 space-y-3">
            <div>
              <Label className="text-xs">Message Text</Label>
              <Textarea
                value={stepData.output.text || ''}
                onChange={(e) => setStepData({ ...stepData, output: { ...stepData.output, text: e.target.value } })}
                onBlur={() => saveStep({ output: stepData.output })}
                rows={4}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input
                value={stepData.output.imageUrl || ''}
                onChange={(e) => setStepData({ ...stepData, output: { ...stepData.output, imageUrl: e.target.value } })}
                onBlur={() => saveStep({ output: stepData.output })}
                className="mt-1 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <Label className="text-xs">Typing Delay (ms)</Label>
              <Input
                type="number"
                value={stepData.output.typingDelay || 0}
                onChange={(e) => setStepData({ ...stepData, output: { ...stepData.output, typingDelay: parseInt(e.target.value) || 0 } })}
                onBlur={() => saveStep({ output: stepData.output })}
                className="mt-1 text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="input" className="mt-0 space-y-3">
            <div>
              <Label className="text-xs">Input Type</Label>
              <Select
                value={stepData.input.type || 'none'}
                onValueChange={(value) => {
                  const updated = { ...stepData, input: { ...stepData.input, type: value } };
                  setStepData(updated);
                  saveStep({ input: updated.input });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="button">Button</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={stepData.input.placeholder || ''}
                onChange={(e) => setStepData({ ...stepData, input: { ...stepData.input, placeholder: e.target.value } })}
                onBlur={() => saveStep({ input: stepData.input })}
                className="mt-1 text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="jump" className="mt-0 space-y-3">
            <p className="text-xs text-muted-foreground">Jump targets for this step:</p>
            {stepData.jump.map((j, i) => (
              <div key={i} className="p-2 rounded border bg-muted/30 space-y-2">
                {j.buttonLabel && (
                  <p className="text-xs font-medium">Button: {j.buttonLabel}</p>
                )}
                {j.isDefault && (
                  <p className="text-xs font-medium text-blue-600">Default jump</p>
                )}
                <div>
                  <Label className="text-xs">Target Step</Label>
                  <Select
                    value={j.targetStepId}
                    onValueChange={(value) => {
                      const updatedJumps = [...stepData.jump];
                      updatedJumps[i] = { ...updatedJumps[i], targetStepId: value };
                      const updated = { ...stepData, jump: updatedJumps };
                      setStepData(updated);
                      saveStep({ jump: updated.jump });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allSteps.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {stepData.jump.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No jump targets configured</p>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Typing Indicator</Label>
              <Switch
                checked={stepData.settings.typingIndicator ?? true}
                onCheckedChange={(checked) => {
                  const updated = { ...stepData, settings: { ...stepData.settings, typingIndicator: checked } };
                  setStepData(updated);
                  saveStep({ settings: updated.settings });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Delay Before Showing (ms)</Label>
              <Input
                type="number"
                value={stepData.settings.delayMs || 0}
                onChange={(e) => setStepData({ ...stepData, settings: { ...stepData.settings, delayMs: parseInt(e.target.value) || 0 } })}
                onBlur={() => saveStep({ settings: stepData.settings })}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Skip Logic (condition)</Label>
              <Input
                value={stepData.settings.skipLogic || ''}
                onChange={(e) => setStepData({ ...stepData, settings: { ...stepData.settings, skipLogic: e.target.value } })}
                onBlur={() => saveStep({ settings: stepData.settings })}
                className="mt-1 text-sm"
                placeholder="e.g., variable == 'skip'"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {saving && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          Saving...
        </div>
      )}
    </div>
  );
}
