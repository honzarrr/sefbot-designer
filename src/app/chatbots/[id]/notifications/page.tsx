'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  toggleNotification,
  duplicateNotification,
} from '@/lib/chatbot-api';
import { NotificationData, NotificationType, JumpRuleConditionRule } from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  Copy,
  MoreHorizontal,
  Mail,
  Globe,
  Bell,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const NOTIF_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  email: { label: 'Email', icon: Mail },
  webhook: { label: 'JSON Webhook', icon: Globe },
};

const OPERATORS = ['equals', 'not_equals', 'contains', 'is_set', 'is_not_set'];

export default function NotificationsPage() {
  const params = useParams() ?? {};
  const chatbotId = (params?.id as string) || '';

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<NotificationType>('email');

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications(chatbotId);
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const selected = notifications.find((n) => n.id === selectedId) || null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const notif = await createNotification(chatbotId, {
      name: newName.trim(),
      type: newType,
    });
    setNotifications((prev) => [notif, ...prev]);
    setSelectedId(notif.id);
    setNewName('');
    setCreateOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(chatbotId, id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleToggle = async (id: string) => {
    await toggleNotification(chatbotId, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, active: !n.active } : n))
    );
  };

  const handleDuplicate = async (id: string) => {
    const notif = await duplicateNotification(chatbotId, id);
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleUpdate = async (id: string, updates: Partial<NotificationData>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
    try {
      await updateNotification(chatbotId, id, updates);
    } catch (e) {
      console.error('Failed to update notification:', e);
    }
  };

  const config = selected?.config || {};
  const conditions = selected?.conditions || null;

  const updateConfig = (patch: Record<string, unknown>) => {
    if (!selected) return;
    handleUpdate(selected.id, { config: { ...config, ...patch } });
  };

  const setConditions = (cond: Record<string, unknown> | null) => {
    if (!selected) return;
    handleUpdate(selected.id, { conditions: cond as NotificationData['conditions'] });
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading notifications...</div>;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Notification list */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">Notifications</span>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {notifications.map((notif) => {
              const TypeInfo = NOTIF_TYPE_LABELS[notif.type] || { label: notif.type, icon: Bell };
              const isActive = selectedId === notif.id;
              return (
                <div
                  key={notif.id}
                  className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer group text-sm
                    ${isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'}
                  `}
                  onClick={() => setSelectedId(notif.id)}
                >
                  <TypeInfo.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{notif.name}</div>
                    <div className="text-xs text-muted-foreground">{TypeInfo.label}</div>
                  </div>
                  <button
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(notif.id);
                    }}
                  >
                    {notif.active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDuplicate(notif.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(notif.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            {notifications.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">
                No notifications yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Notification editor */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <ScrollArea className="h-full">
            <div className="p-6 max-w-2xl space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold flex-1">{selected.name}</h2>
                <Badge variant={selected.active ? 'default' : 'secondary'}>
                  {selected.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  value={selected.name}
                  onChange={(e) => handleUpdate(selected.id, { name: e.target.value })}
                  className="text-sm"
                />
              </div>

              {/* Email config */}
              {selected.type === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Reply-to</label>
                    <Input
                      value={(config.replyTo as string) || ''}
                      onChange={(e) => updateConfig({ replyTo: e.target.value })}
                      placeholder="noreply@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Recipients (CC)</label>
                    <Input
                      value={((config.cc as string[]) || []).join(', ')}
                      onChange={(e) => updateConfig({ cc: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="user@example.com, admin@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">BCC</label>
                    <Input
                      value={((config.bcc as string[]) || []).join(', ')}
                      onChange={(e) => updateConfig({ bcc: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="hidden@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">HTML Body</label>
                    <textarea
                      value={(config.template as string) || ''}
                      onChange={(e) => updateConfig({ template: e.target.value })}
                      placeholder="<h1>New submission</h1><p>{{variable_name}}</p>"
                      className="w-full min-h-[120px] text-sm bg-transparent border rounded-md p-2 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={6}
                    />
                  </div>
                </div>
              )}

              {/* Webhook config */}
              {selected.type === 'webhook' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
                    <Input
                      value={(config.webhookUrl as string) || ''}
                      onChange={(e) => updateConfig({ webhookUrl: e.target.value })}
                      placeholder="https://api.example.com/webhook"
                      className="text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Basic Auth Username</label>
                    <Input
                      value={(config.basicAuthUser as string) || ''}
                      onChange={(e) => updateConfig({ basicAuthUser: e.target.value })}
                      placeholder="username"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Basic Auth Password</label>
                    <Input
                      type="password"
                      value={(config.basicAuthPass as string) || ''}
                      onChange={(e) => updateConfig({ basicAuthPass: e.target.value })}
                      placeholder="password"
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Conditions</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => {
                      const current = (conditions as Record<string, unknown>) || {};
                      const rules = ((current.rules as JumpRuleConditionRule[]) || []);
                      setConditions({
                        ...current,
                        logic: (current.logic as string) || 'AND',
                        rules: [...rules, { variable: '', operator: 'equals', value: '' }],
                      });
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>

                {conditions && (conditions as Record<string, unknown>).rules ? (
                  <div className="space-y-1.5">
                    {((conditions as Record<string, unknown>).rules as JumpRuleConditionRule[]).map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && (
                          <button
                            className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted"
                            onClick={() => {
                              const c = conditions as Record<string, unknown>;
                              setConditions({ ...c, logic: c.logic === 'AND' ? 'OR' : 'AND' });
                            }}
                          >
                            {String((conditions as Record<string, unknown>).logic || 'AND')}
                          </button>
                        )}
                        {idx === 0 && <span className="text-xs w-8">If</span>}
                        <Input
                          value={rule.variable}
                          onChange={(e) => {
                            const c = conditions as Record<string, unknown>;
                            const rules = [...((c.rules as JumpRuleConditionRule[]) || [])];
                            rules[idx] = { ...rules[idx], variable: e.target.value };
                            setConditions({ ...c, rules });
                          }}
                          placeholder="Variable"
                          className="text-xs h-7 flex-1"
                        />
                        <select
                          value={rule.operator}
                          onChange={(e) => {
                            const c = conditions as Record<string, unknown>;
                            const rules = [...((c.rules as JumpRuleConditionRule[]) || [])];
                            rules[idx] = { ...rules[idx], operator: e.target.value };
                            setConditions({ ...c, rules });
                          }}
                          className="text-xs h-7 border rounded px-1 bg-background"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <Input
                          value={rule.value}
                          onChange={(e) => {
                            const c = conditions as Record<string, unknown>;
                            const rules = [...((c.rules as JumpRuleConditionRule[]) || [])];
                            rules[idx] = { ...rules[idx], value: e.target.value };
                            setConditions({ ...c, rules });
                          }}
                          placeholder="Value"
                          className="text-xs h-7 flex-1"
                        />
                        <button
                          className="p-1 rounded text-destructive hover:bg-muted"
                          onClick={() => {
                            const c = conditions as Record<string, unknown>;
                            const rules = ((c.rules as JumpRuleConditionRule[]) || []).filter((_, i) => i !== idx);
                            setConditions(rules.length > 0 ? { ...c, rules } : null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a notification to edit</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input
              placeholder="Notification name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              {Object.entries(NOTIF_TYPE_LABELS).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={newType === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewType(key as NotificationType)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
