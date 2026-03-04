'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchSettings, saveSettings, fetchEmbedCode } from '@/lib/chatbot-api';
import {
  ChatbotSettings,
  WorkHours,
  DesignColors,
  SmartStartDefault,
  SmartStartCondition,
  SmartStartAnimation,
  ConversionItem,
  ConversionType,
  DefaultResponse,
  CustomVariable,
  WidgetPosition,
} from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Save,
  Copy,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Palette,
  MessageSquare,
  Target,
  MessageCircle,
  Variable,
  Code,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { v4 as uuid } from 'uuid';

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="flex items-center gap-2 text-sm" onClick={() => onChange(!value)}>
      {value ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
      <span>{label}</span>
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground w-32 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#4A90D9'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded border cursor-pointer"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="text-sm h-8 w-28 font-mono"
        />
      </div>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ANIMATIONS: SmartStartAnimation[] = ['bounce', 'pulse', 'shake', 'none'];
const CONVERSION_TYPES: { key: ConversionType; label: string }[] = [
  { key: 'chatbot_open', label: 'Chatbot Open' },
  { key: 'redirect', label: 'Redirect' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
];

export default function ChatbotSettingsPage() {
  const params = useParams() ?? {};
  const chatbotId = (params?.id as string) || '';

  const [settings, setSettings] = useState<ChatbotSettings>({});
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchSettings(chatbotId),
      fetchEmbedCode(chatbotId),
    ]).then(([s, code]) => {
      setSettings(s || {});
      setEmbedCode(code);
    }).catch(console.error).finally(() => setLoading(false));
  }, [chatbotId]);

  const update = (patch: Partial<ChatbotSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(chatbotId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Work hours helpers
  const workHours: WorkHours = settings.workHours || { start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] };
  const updateWorkHours = (patch: Partial<WorkHours>) => {
    update({ workHours: { ...workHours, ...patch } });
  };
  const toggleDay = (day: number) => {
    const days = workHours.days.includes(day)
      ? workHours.days.filter((d) => d !== day)
      : [...workHours.days, day].sort();
    updateWorkHours({ days });
  };

  // Design helpers
  const design = settings.design || {};
  const colors: DesignColors = design.colors || {};
  const updateDesign = (patch: Partial<typeof design>) => {
    update({ design: { ...design, ...patch } });
  };
  const updateColor = (key: keyof DesignColors, value: string) => {
    updateDesign({ colors: { ...colors, [key]: value } });
  };

  // Smart start helpers
  const smartStart: SmartStartDefault = settings.smartStart || {};
  const updateSmartStart = (patch: Partial<SmartStartDefault>) => {
    update({ smartStart: { ...smartStart, ...patch } });
  };

  // Smart start conditions
  const conditions: SmartStartCondition[] = settings.smartStartConditions || [];
  const addCondition = () => {
    update({
      smartStartConditions: [...conditions, {
        id: uuid(),
        phase: 'pre_init',
        logic: 'AND',
        rules: [{ variable: '', operator: 'equals', value: '' }],
      }],
    });
  };
  const updateCondition = (id: string, patch: Partial<SmartStartCondition>) => {
    update({
      smartStartConditions: conditions.map((c) => c.id === id ? { ...c, ...patch } : c),
    });
  };
  const deleteCondition = (id: string) => {
    update({ smartStartConditions: conditions.filter((c) => c.id !== id) });
  };

  // Conversions
  const conversions: ConversionItem[] = settings.conversions || [];
  const addConversion = () => {
    update({
      conversions: [...conversions, { id: uuid(), name: 'New conversion', type: 'chatbot_open' }],
    });
  };

  // Default responses
  const defaultResponses: DefaultResponse[] = settings.defaultResponses || [
    { key: 'invalid', messages: { en: 'Invalid input. Please try again.' } },
    { key: 'missing', messages: { en: 'This field is required.' } },
    { key: 'nothing_found', messages: { en: 'Nothing found.' } },
  ];

  // Variables
  const customVars: CustomVariable[] = settings.customVariables || [];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Save bar */}
      <div className="px-6 py-2 border-b flex items-center justify-end gap-2">
        {saved && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Saved
          </div>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-8">
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="main" className="gap-1"><MessageSquare className="h-3.5 w-3.5" />Main</TabsTrigger>
              <TabsTrigger value="design" className="gap-1"><Palette className="h-3.5 w-3.5" />Design</TabsTrigger>
              <TabsTrigger value="smartstart" className="gap-1"><MessageCircle className="h-3.5 w-3.5" />Smart Start</TabsTrigger>
              <TabsTrigger value="conversions" className="gap-1"><Target className="h-3.5 w-3.5" />Conversions</TabsTrigger>
              <TabsTrigger value="responses" className="gap-1"><MessageCircle className="h-3.5 w-3.5" />Default Responses</TabsTrigger>
              <TabsTrigger value="variables" className="gap-1"><Variable className="h-3.5 w-3.5" />Variables</TabsTrigger>
            </TabsList>

            {/* === MAIN === */}
            <TabsContent value="main" className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Bot Name</h3>
                <Input
                  value={settings.name || ''}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="My Chatbot"
                />
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Languages</h3>
                <div className="flex gap-2 flex-wrap">
                  {(settings.languages || ['en']).map((lang, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {lang}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={() => {
                          const next = (settings.languages || ['en']).filter((_, j) => j !== i);
                          update({ languages: next });
                        }}
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => {
                      const lang = prompt('Language code (e.g. cs, de, fr):');
                      if (lang) update({ languages: [...(settings.languages || ['en']), lang] });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed Code
                </h3>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {embedCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 h-7 gap-1"
                    onClick={copyEmbed}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(`/widget/${chatbotId}`, '_blank')}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Preview Widget
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Opens the widget in a test page
                  </span>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Work Hours
                </h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-16">Start</label>
                  <Input
                    type="time"
                    value={workHours.start}
                    onChange={(e) => updateWorkHours({ start: e.target.value })}
                    className="w-32 text-sm"
                  />
                  <label className="text-sm text-muted-foreground w-16">End</label>
                  <Input
                    type="time"
                    value={workHours.end}
                    onChange={(e) => updateWorkHours({ end: e.target.value })}
                    className="w-32 text-sm"
                  />
                </div>
                <div className="flex gap-1.5">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      className={`h-8 w-10 rounded text-xs font-medium transition-colors
                        ${workHours.days.includes(i)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                        }
                      `}
                      onClick={() => toggleDay(i)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* === DESIGN === */}
            <TabsContent value="design" className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Colors</h3>
                <div className="space-y-2">
                  <ColorField label="Theme" value={colors.theme || '#4A90D9'} onChange={(v) => updateColor('theme', v)} />
                  <ColorField label="Hover" value={colors.hover || '#3A7BC8'} onChange={(v) => updateColor('hover', v)} />
                  <ColorField label="Message BG" value={colors.messageBg || '#F5F5F5'} onChange={(v) => updateColor('messageBg', v)} />
                  <ColorField label="Message Text" value={colors.messageText || '#333333'} onChange={(v) => updateColor('messageText', v)} />
                  <ColorField label="Inverse" value={colors.inverse || '#FFFFFF'} onChange={(v) => updateColor('inverse', v)} />
                  <ColorField label="Avatar" value={colors.avatar || '#4A90D9'} onChange={(v) => updateColor('avatar', v)} />
                  <ColorField label="Error" value={colors.error || '#F44336'} onChange={(v) => updateColor('error', v)} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Position</h3>
                <div className="flex gap-1.5">
                  {(['right', 'center', 'full'] as WidgetPosition[]).map((pos) => (
                    <Button
                      key={pos}
                      size="sm"
                      variant={design.position === pos ? 'default' : 'outline'}
                      onClick={() => updateDesign({ position: pos })}
                      className="capitalize text-xs"
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </section>

              <Toggle
                value={design.closeButton !== false}
                onChange={(v) => updateDesign({ closeButton: v })}
                label="Show close button"
              />

              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Background</h3>
                <Input
                  value={design.background || ''}
                  onChange={(e) => updateDesign({ background: e.target.value })}
                  placeholder="CSS background value (e.g. #f0f0f0, url(...))"
                  className="text-sm"
                />
              </section>
            </TabsContent>

            {/* === SMART START === */}
            <TabsContent value="smartstart" className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold text-sm">Default Smart Start</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Avatar URL</label>
                    <Input
                      value={smartStart.avatar || ''}
                      onChange={(e) => updateSmartStart({ avatar: e.target.value })}
                      placeholder="https://..."
                      className="text-sm flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Animation</label>
                    <div className="flex gap-1">
                      {ANIMATIONS.map((anim) => (
                        <Button
                          key={anim}
                          size="sm"
                          variant={smartStart.animation === anim ? 'default' : 'outline'}
                          onClick={() => updateSmartStart({ animation: anim })}
                          className="capitalize text-xs"
                        >
                          {anim}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Greeting text</label>
                    <Input
                      value={smartStart.text || ''}
                      onChange={(e) => updateSmartStart({ text: e.target.value })}
                      placeholder="Hi! How can I help you?"
                      className="text-sm flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Button text</label>
                    <Input
                      value={smartStart.buttonText || ''}
                      onChange={(e) => updateSmartStart({ buttonText: e.target.value })}
                      placeholder="Start chat"
                      className="text-sm flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Delay (ms)</label>
                    <Input
                      type="number"
                      value={smartStart.delay || 0}
                      onChange={(e) => updateSmartStart({ delay: parseInt(e.target.value) || 0 })}
                      className="text-sm w-24"
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground w-32">Main avatar URL</label>
                    <Input
                      value={smartStart.mainAvatar || ''}
                      onChange={(e) => updateSmartStart({ mainAvatar: e.target.value })}
                      placeholder="https://..."
                      className="text-sm flex-1"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Conditional Smart Start</h3>
                  <Button size="sm" variant="outline" onClick={addCondition} className="h-7 gap-1">
                    <Plus className="h-3 w-3" />
                    Add Condition
                  </Button>
                </div>

                {conditions.map((cond) => (
                  <div key={cond.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <select
                          value={cond.phase}
                          onChange={(e) => updateCondition(cond.id, { phase: e.target.value as 'pre_init' | 'post_init' })}
                          className="text-xs h-7 border rounded px-1.5 bg-background"
                        >
                          <option value="pre_init">Pre-init</option>
                          <option value="post_init">Post-init</option>
                        </select>
                        <button
                          className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20"
                          onClick={() => updateCondition(cond.id, { logic: cond.logic === 'AND' ? 'OR' : 'AND' })}
                        >
                          {cond.logic}
                        </button>
                      </div>
                      <button
                        className="p-1 rounded text-destructive hover:bg-muted"
                        onClick={() => deleteCondition(cond.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {cond.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          value={rule.variable}
                          onChange={(e) => {
                            const rules = [...cond.rules];
                            rules[idx] = { ...rules[idx], variable: e.target.value };
                            updateCondition(cond.id, { rules });
                          }}
                          placeholder="Variable"
                          className="text-xs h-7 flex-1"
                        />
                        <select
                          value={rule.operator}
                          onChange={(e) => {
                            const rules = [...cond.rules];
                            rules[idx] = { ...rules[idx], operator: e.target.value };
                            updateCondition(cond.id, { rules });
                          }}
                          className="text-xs h-7 border rounded px-1 bg-background"
                        >
                          {['equals', 'not_equals', 'contains', 'is_set'].map((op) => (
                            <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <Input
                          value={rule.value}
                          onChange={(e) => {
                            const rules = [...cond.rules];
                            rules[idx] = { ...rules[idx], value: e.target.value };
                            updateCondition(cond.id, { rules });
                          }}
                          placeholder="Value"
                          className="text-xs h-7 flex-1"
                        />
                        <button
                          className="p-1 rounded text-destructive hover:bg-muted"
                          onClick={() => {
                            const rules = cond.rules.filter((_, i) => i !== idx);
                            updateCondition(cond.id, { rules });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
                      onClick={() => {
                        updateCondition(cond.id, {
                          rules: [...cond.rules, { variable: '', operator: 'equals', value: '' }],
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Rule
                    </Button>

                    <div className="flex items-center gap-3 pt-1 border-t">
                      <label className="text-xs text-muted-foreground">Starting step ID</label>
                      <Input
                        value={cond.startingStepId || ''}
                        onChange={(e) => updateCondition(cond.id, { startingStepId: e.target.value })}
                        placeholder="Step ID"
                        className="text-xs h-7 flex-1"
                      />
                    </div>
                  </div>
                ))}
              </section>
            </TabsContent>

            {/* === CONVERSIONS === */}
            <TabsContent value="conversions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Conversions</h3>
                <Button size="sm" variant="outline" onClick={addConversion} className="h-7 gap-1">
                  <Plus className="h-3 w-3" />
                  Add Conversion
                </Button>
              </div>

              {conversions.map((conv, i) => (
                <div key={conv.id} className="flex items-center gap-2 border rounded-lg p-3">
                  <Input
                    value={conv.name}
                    onChange={(e) => {
                      const next = [...conversions];
                      next[i] = { ...next[i], name: e.target.value };
                      update({ conversions: next });
                    }}
                    placeholder="Conversion name"
                    className="text-sm flex-1"
                  />
                  <select
                    value={conv.type}
                    onChange={(e) => {
                      const next = [...conversions];
                      next[i] = { ...next[i], type: e.target.value as ConversionType };
                      update({ conversions: next });
                    }}
                    className="text-sm h-9 border rounded px-2 bg-background"
                  >
                    {CONVERSION_TYPES.map((ct) => (
                      <option key={ct.key} value={ct.key}>{ct.label}</option>
                    ))}
                  </select>
                  <button
                    className="p-1.5 rounded text-destructive hover:bg-muted"
                    onClick={() => update({ conversions: conversions.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </TabsContent>

            {/* === DEFAULT RESPONSES === */}
            <TabsContent value="responses" className="space-y-4">
              <h3 className="font-semibold text-sm">Default Responses</h3>
              {defaultResponses.map((resp, i) => (
                <div key={resp.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {resp.key.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {Object.entries(resp.messages).map(([lang, msg]) => (
                    <div key={lang} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs w-8 justify-center">{lang}</Badge>
                      <Input
                        value={msg}
                        onChange={(e) => {
                          const next = [...defaultResponses];
                          next[i] = { ...next[i], messages: { ...next[i].messages, [lang]: e.target.value } };
                          update({ defaultResponses: next });
                        }}
                        className="text-sm flex-1"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => {
                      const lang = prompt('Language code:');
                      if (lang) {
                        const next = [...defaultResponses];
                        next[i] = { ...next[i], messages: { ...next[i].messages, [lang]: '' } };
                        update({ defaultResponses: next });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Language
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* === VARIABLES === */}
            <TabsContent value="variables" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Custom Variables</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1"
                  onClick={() => {
                    update({
                      customVariables: [...customVars, { id: uuid(), name: '', source: 'script' }],
                    });
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add Variable
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Variables collected from step settings are automatically detected.
                Add custom variables for use in scripts and conditions.
              </div>

              {customVars.map((v, i) => (
                <div key={v.id} className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={v.name}
                    onChange={(e) => {
                      const next = [...customVars];
                      next[i] = { ...next[i], name: e.target.value };
                      update({ customVariables: next });
                    }}
                    placeholder="variable_name"
                    className="text-sm font-mono flex-1"
                  />
                  <Badge variant="secondary" className="text-xs">{v.source}</Badge>
                  <button
                    className="p-1.5 rounded text-destructive hover:bg-muted"
                    onClick={() => update({ customVariables: customVars.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
