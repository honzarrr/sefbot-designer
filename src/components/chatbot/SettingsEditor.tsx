'use client';

import { ChatbotStepData, StepType } from '@/types/chatbot';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const STEP_TYPE_LABELS: Record<string, string> = {
  button: 'Button',
  carousel: 'Carousel',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  answer: 'Answer',
  logic: 'Logic',
  calendar: 'Calendar',
  stars: 'Stars',
  file: 'File',
};

const COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#009688', '#4CAF50', '#FF9800', '#607D8B',
];

interface SettingsEditorProps {
  step: ChatbotStepData;
  onUpdate: (updates: Partial<ChatbotStepData>) => void;
}

export function SettingsEditor({ step, onUpdate }: SettingsEditorProps) {
  const settings = step.settings || {};

  const updateSetting = (key: string, value: unknown) => {
    onUpdate({ settings: { ...settings, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Step Settings</h3>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Step Name</label>
        <Input
          value={step.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="text-sm"
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Step Type</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between text-sm">
              <span className="capitalize">{STEP_TYPE_LABELS[step.type] || step.type}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full">
            {Object.entries(STEP_TYPE_LABELS).map(([key, label]) => (
              <DropdownMenuItem key={key} onClick={() => onUpdate({ type: key })}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Color</label>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`h-7 w-7 rounded-full border-2 transition-all
                ${step.color === c ? 'border-foreground scale-110' : 'border-transparent hover:border-muted-foreground/30'}
              `}
              style={{ backgroundColor: c }}
              onClick={() => onUpdate({ color: c })}
            />
          ))}
        </div>
      </div>

      {/* Type-specific settings */}
      {step.type === StepType.Button && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Button Settings</span>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Timeout message</label>
            <Input
              value={(settings.timeoutMessage as string) || ''}
              onChange={(e) => updateSetting('timeoutMessage', e.target.value)}
              placeholder="Message after timeout..."
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Timeout (seconds)</label>
            <Input
              type="number"
              value={(settings.timeoutSeconds as number) || ''}
              onChange={(e) => updateSetting('timeoutSeconds', parseInt(e.target.value) || 0)}
              placeholder="0 = no timeout"
              className="text-sm w-32"
              min={0}
            />
          </div>
        </div>
      )}

      {step.type === StepType.Answer && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Answer Settings</span>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Validation pattern (regex)</label>
            <Input
              value={(settings.validationPattern as string) || ''}
              onChange={(e) => updateSetting('validationPattern', e.target.value)}
              placeholder="e.g. ^[A-Z]{2}\\d{4}$"
              className="text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Validation error message</label>
            <Input
              value={(settings.validationError as string) || ''}
              onChange={(e) => updateSetting('validationError', e.target.value)}
              placeholder="Invalid format"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Save to variable</label>
            <Input
              value={(settings.saveVariable as string) || ''}
              onChange={(e) => updateSetting('saveVariable', e.target.value)}
              placeholder="variable_name"
              className="text-sm font-mono"
            />
          </div>
        </div>
      )}

      {step.type === StepType.Email && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Email Settings</span>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Save to variable</label>
            <Input
              value={(settings.saveVariable as string) || ''}
              onChange={(e) => updateSetting('saveVariable', e.target.value)}
              placeholder="email"
              className="text-sm font-mono"
            />
          </div>
        </div>
      )}

      {step.type === StepType.Phone && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">Phone Settings</span>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Default country code</label>
            <Input
              value={(settings.defaultCountryCode as string) || ''}
              onChange={(e) => updateSetting('defaultCountryCode', e.target.value)}
              placeholder="e.g. +420"
              className="text-sm w-32"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Save to variable</label>
            <Input
              value={(settings.saveVariable as string) || ''}
              onChange={(e) => updateSetting('saveVariable', e.target.value)}
              placeholder="phone"
              className="text-sm font-mono"
            />
          </div>
        </div>
      )}

      {(step.type === StepType.Location ||
        step.type === StepType.Calendar ||
        step.type === StepType.Stars ||
        step.type === StepType.File ||
        step.type === StepType.Logic ||
        step.type === StepType.Carousel) && (
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">
            {STEP_TYPE_LABELS[step.type]} Settings
          </span>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Save to variable</label>
            <Input
              value={(settings.saveVariable as string) || ''}
              onChange={(e) => updateSetting('saveVariable', e.target.value)}
              placeholder="variable_name"
              className="text-sm font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
