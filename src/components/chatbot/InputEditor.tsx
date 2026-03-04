'use client';

import React from 'react';
import {
  StepType,
  StepInput,
  ButtonInput,
  ButtonInputItem,
  CarouselInput,
  CarouselInputItem,
  EmailInput,
  PhoneInput,
  LocationInput,
  AnswerInput,
  LogicInput,
  CalendarInput,
  StarsInput,
  FileInput,
  ButtonDisplayMode,
} from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  GripVertical,
  Star,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
} from 'lucide-react';
import { v4 as uuid } from 'uuid';

interface InputEditorProps {
  stepType: string;
  input: StepInput;
  onChange: (input: StepInput) => void;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      className="flex items-center gap-2 text-sm"
      onClick={() => onChange(!value)}
    >
      {value ? (
        <ToggleRight className="h-5 w-5 text-primary" />
      ) : (
        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
      )}
      <span>{label}</span>
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground w-32 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// === BUTTON INPUT ===
function ButtonInputEditor({
  input,
  onChange,
}: {
  input: ButtonInput;
  onChange: (input: ButtonInput) => void;
}) {
  const addButton = () => {
    const newBtn: ButtonInputItem = {
      id: uuid(),
      text: 'New button',
      displayMode: input.buttons[0]?.displayMode || 'list',
    };
    onChange({ buttons: [...input.buttons, newBtn] });
  };

  const updateButton = (id: string, updates: Partial<ButtonInputItem>) => {
    onChange({
      buttons: input.buttons.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteButton = (id: string) => {
    onChange({ buttons: input.buttons.filter((b) => b.id !== id) });
  };

  const setDisplayMode = (mode: ButtonDisplayMode) => {
    onChange({
      buttons: input.buttons.map((b) => ({ ...b, displayMode: mode })),
    });
  };

  const currentMode = input.buttons[0]?.displayMode || 'list';

  return (
    <div className="space-y-3">
      <FieldRow label="Display">
        <div className="flex gap-1">
          {(['list', 'grid'] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={currentMode === mode ? 'default' : 'outline'}
              onClick={() => setDisplayMode(mode)}
              className="text-xs capitalize"
            >
              {mode}
            </Button>
          ))}
        </div>
      </FieldRow>

      <div className="space-y-1.5">
        {input.buttons.map((btn) => (
          <div key={btn.id} className="flex items-center gap-2 group">
            <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab shrink-0" />
            <Input
              value={btn.text}
              onChange={(e) => updateButton(btn.id, { text: e.target.value })}
              className="text-sm h-8 flex-1"
              placeholder="Button text"
            />
            <Input
              value={btn.icon || ''}
              onChange={(e) => updateButton(btn.id, { icon: e.target.value })}
              className="text-sm h-8 w-20"
              placeholder="Icon"
            />
            <button
              className={`p-1 rounded text-xs ${btn.highlighted ? 'bg-yellow-100 text-yellow-800' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => updateButton(btn.id, { highlighted: !btn.highlighted })}
              title="Highlight"
            >
              <Sparkles className="h-3 w-3" />
            </button>
            <button
              className="p-1 rounded text-destructive opacity-0 group-hover:opacity-100"
              onClick={() => deleteButton(btn.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" onClick={addButton} className="w-full">
        <Plus className="h-3 w-3 mr-1" />
        Add Button
      </Button>

      {/* Yes/No shortcut */}
      {input.buttons.length === 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs"
          onClick={() => {
            onChange({
              buttons: [
                { id: uuid(), text: 'Yes', displayMode: 'list' },
                { id: uuid(), text: 'No', displayMode: 'list' },
              ],
            });
          }}
        >
          Quick: Yes / No
        </Button>
      )}
    </div>
  );
}

// === CAROUSEL INPUT ===
function CarouselInputEditor({
  input,
  onChange,
}: {
  input: CarouselInput;
  onChange: (input: CarouselInput) => void;
}) {
  const addCard = () => {
    const newCard: CarouselInputItem = {
      id: uuid(),
      image: '',
      title: 'New card',
      description: '',
      buttonText: 'Select',
    };
    onChange({ items: [...input.items, newCard] });
  };

  const updateCard = (id: string, updates: Partial<CarouselInputItem>) => {
    onChange({
      items: input.items.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  };

  const deleteCard = (id: string) => {
    onChange({ items: input.items.filter((c) => c.id !== id) });
  };

  return (
    <div className="space-y-3">
      {input.items.map((card) => (
        <div key={card.id} className="border rounded-lg p-3 space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Card</span>
            <button
              className="p-1 rounded text-destructive opacity-0 group-hover:opacity-100"
              onClick={() => deleteCard(card.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={card.image}
              onChange={(e) => updateCard(card.id, { image: e.target.value })}
              placeholder="Image URL"
              className="text-sm h-8"
            />
          </div>
          <Input
            value={card.title}
            onChange={(e) => updateCard(card.id, { title: e.target.value })}
            placeholder="Title"
            className="text-sm h-8"
          />
          <Input
            value={card.description}
            onChange={(e) => updateCard(card.id, { description: e.target.value })}
            placeholder="Description"
            className="text-sm h-8"
          />
          <Input
            value={card.buttonText}
            onChange={(e) => updateCard(card.id, { buttonText: e.target.value })}
            placeholder="Button text"
            className="text-sm h-8"
          />
        </div>
      ))}

      <Button size="sm" variant="outline" onClick={addCard} className="w-full">
        <Plus className="h-3 w-3 mr-1" />
        Add Card
      </Button>
    </div>
  );
}

// === EMAIL INPUT ===
function EmailInputEditor({
  input,
  onChange,
}: {
  input: EmailInput;
  onChange: (input: EmailInput) => void;
}) {
  return (
    <FieldRow label="Placeholder">
      <Input
        value={input.placeholder}
        onChange={(e) => onChange({ ...input, placeholder: e.target.value })}
        placeholder="Enter your email..."
        className="text-sm h-8"
      />
    </FieldRow>
  );
}

// === PHONE INPUT ===
function PhoneInputEditor({
  input,
  onChange,
}: {
  input: PhoneInput;
  onChange: (input: PhoneInput) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldRow label="Placeholder">
        <Input
          value={input.placeholder}
          onChange={(e) => onChange({ ...input, placeholder: e.target.value })}
          placeholder="Enter phone number..."
          className="text-sm h-8"
        />
      </FieldRow>
      <Toggle
        value={input.requirePrefix}
        onChange={(v) => onChange({ ...input, requirePrefix: v })}
        label="Require country prefix"
      />
    </div>
  );
}

// === LOCATION INPUT ===
function LocationInputEditor({
  input,
  onChange,
}: {
  input: LocationInput;
  onChange: (input: LocationInput) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldRow label="Provider">
        <div className="flex gap-1">
          {([
            { key: 'google' as const, label: 'Google Maps' },
            { key: 'mapy_cz' as const, label: 'Mapy.cz' },
          ]).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={input.provider === key ? 'default' : 'outline'}
              onClick={() => onChange({ ...input, provider: key })}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Country Limit">
        <Input
          value={input.countryLimit || ''}
          onChange={(e) => onChange({ ...input, countryLimit: e.target.value })}
          placeholder="e.g. CZ, US"
          className="text-sm h-8"
        />
      </FieldRow>
      <FieldRow label="Placeholder">
        <Input
          value={input.placeholder}
          onChange={(e) => onChange({ ...input, placeholder: e.target.value })}
          placeholder="Search location..."
          className="text-sm h-8"
        />
      </FieldRow>
    </div>
  );
}

// === ANSWER INPUT ===
function AnswerInputEditor({
  input,
  onChange,
}: {
  input: AnswerInput;
  onChange: (input: AnswerInput) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldRow label="Placeholder">
        <Input
          value={input.placeholder}
          onChange={(e) => onChange({ ...input, placeholder: e.target.value })}
          placeholder="Type here..."
          className="text-sm h-8"
        />
      </FieldRow>
      <Toggle
        value={input.sendOnEnter}
        onChange={(v) => onChange({ ...input, sendOnEnter: v })}
        label="Send on Enter"
      />
      <Toggle
        value={input.optional}
        onChange={(v) => onChange({ ...input, optional: v })}
        label="Optional (can skip)"
      />
      <Toggle
        value={input.numbersOnly}
        onChange={(v) => onChange({ ...input, numbersOnly: v })}
        label="Numbers only"
      />
      {input.numbersOnly && (
        <>
          <FieldRow label="Units">
            <Input
              value={input.units || ''}
              onChange={(e) => onChange({ ...input, units: e.target.value })}
              placeholder="e.g. kg, km"
              className="text-sm h-8"
            />
          </FieldRow>
          <Toggle
            value={input.decimals || false}
            onChange={(v) => onChange({ ...input, decimals: v })}
            label="Allow decimals"
          />
          <Toggle
            value={input.thousandsSeparator || false}
            onChange={(v) => onChange({ ...input, thousandsSeparator: v })}
            label="Thousands separator"
          />
        </>
      )}
    </div>
  );
}

// === LOGIC INPUT ===
function LogicInputEditor({
  input,
  onChange,
}: {
  input: LogicInput;
  onChange: (input: LogicInput) => void;
}) {
  return (
    <FieldRow label="Answer Value">
      <div className="flex gap-1">
        {(['text', 'variable'] as const).map((v) => (
          <Button
            key={v}
            size="sm"
            variant={input.answerValue === v ? 'default' : 'outline'}
            onClick={() => onChange({ ...input, answerValue: v })}
            className="text-xs capitalize"
          >
            {v}
          </Button>
        ))}
      </div>
    </FieldRow>
  );
}

// === CALENDAR INPUT ===
function CalendarInputEditor({
  input,
  onChange,
}: {
  input: CalendarInput;
  onChange: (input: CalendarInput) => void;
}) {
  return (
    <div className="space-y-3">
      <Toggle
        value={input.allowPast}
        onChange={(v) => onChange({ ...input, allowPast: v })}
        label="Allow past dates"
      />
      <FieldRow label="Future limit (days)">
        <Input
          type="number"
          value={input.futureDaysLimit}
          onChange={(e) => onChange({ ...input, futureDaysLimit: parseInt(e.target.value) || 0 })}
          className="text-sm h-8 w-24"
          min={0}
        />
      </FieldRow>
      <Toggle
        value={input.startMonday}
        onChange={(v) => onChange({ ...input, startMonday: v })}
        label="Start week on Monday"
      />
    </div>
  );
}

// === STARS INPUT ===
function StarsInputEditor({
  input,
  onChange,
}: {
  input: StarsInput;
  onChange: (input: StarsInput) => void;
}) {
  return (
    <div className="space-y-3">
      <FieldRow label="Icon">
        <div className="flex gap-1">
          {['star', 'heart', 'thumbsup'].map((icon) => (
            <Button
              key={icon}
              size="sm"
              variant={input.icon === icon ? 'default' : 'outline'}
              onClick={() => onChange({ ...input, icon })}
              className="text-xs capitalize"
            >
              {icon === 'star' ? '⭐' : icon === 'heart' ? '❤️' : '👍'} {icon}
            </Button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Count">
        <Input
          type="number"
          value={input.count}
          onChange={(e) => onChange({ ...input, count: parseInt(e.target.value) || 5 })}
          className="text-sm h-8 w-24"
          min={1}
          max={10}
        />
      </FieldRow>
      <FieldRow label="Confirm button">
        <Input
          value={input.confirmButtonText}
          onChange={(e) => onChange({ ...input, confirmButtonText: e.target.value })}
          placeholder="Submit"
          className="text-sm h-8"
        />
      </FieldRow>
      {/* Preview */}
      <div className="flex items-center gap-1 pt-2">
        {Array.from({ length: input.count }, (_, i) => (
          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
        ))}
      </div>
    </div>
  );
}

// === FILE INPUT ===
function FileInputEditor({
  input,
  onChange,
}: {
  input: FileInput;
  onChange: (input: FileInput) => void;
}) {
  return (
    <Toggle
      value={input.allowCamera}
      onChange={(v) => onChange({ ...input, allowCamera: v })}
      label="Allow camera capture"
    />
  );
}

// === MAIN COMPONENT ===
export function InputEditor({ stepType, input, onChange }: InputEditorProps) {
  const getDefaultInput = (type: string): StepInput => {
    switch (type) {
      case StepType.Button:
        return { buttons: [] };
      case StepType.Carousel:
        return { items: [] };
      case StepType.Email:
        return { placeholder: 'Enter your email...' };
      case StepType.Phone:
        return { placeholder: 'Enter phone number...', requirePrefix: false };
      case StepType.Location:
        return { provider: 'google', placeholder: 'Search location...' };
      case StepType.Answer:
        return { placeholder: 'Type here...', sendOnEnter: true, optional: false, numbersOnly: false };
      case StepType.Logic:
        return { answerValue: 'text' };
      case StepType.Calendar:
        return { allowPast: false, futureDaysLimit: 365, startMonday: true };
      case StepType.Stars:
        return { icon: 'star', count: 5, confirmButtonText: 'Submit' };
      case StepType.File:
        return { allowCamera: true };
      default:
        return { buttons: [] };
    }
  };

  // Ensure input has correct shape for the type
  const safeInput = input || getDefaultInput(stepType);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">
        Input: <Badge variant="secondary" className="text-xs capitalize ml-1">{stepType}</Badge>
      </h3>

      {stepType === StepType.Button && (
        <ButtonInputEditor
          input={safeInput as ButtonInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Carousel && (
        <CarouselInputEditor
          input={safeInput as CarouselInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Email && (
        <EmailInputEditor
          input={safeInput as EmailInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Phone && (
        <PhoneInputEditor
          input={safeInput as PhoneInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Location && (
        <LocationInputEditor
          input={safeInput as LocationInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Answer && (
        <AnswerInputEditor
          input={safeInput as AnswerInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Logic && (
        <LogicInputEditor
          input={safeInput as LogicInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Calendar && (
        <CalendarInputEditor
          input={safeInput as CalendarInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.Stars && (
        <StarsInputEditor
          input={safeInput as StarsInput}
          onChange={onChange}
        />
      )}
      {stepType === StepType.File && (
        <FileInputEditor
          input={safeInput as FileInput}
          onChange={onChange}
        />
      )}
    </div>
  );
}
