'use client';

import {
  JumpRule,
  JumpRuleCondition,
  JumpRuleConditionRule,
  JumpTarget,
  JumpUrlTarget,
  ChatbotStepData,
} from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  ChevronDown,
  Link2,
  LogOut,
  CornerDownRight,
} from 'lucide-react';
import { v4 as uuid } from 'uuid';

interface JumpEditorProps {
  rules: JumpRule[];
  steps: ChatbotStepData[];
  onChange: (rules: JumpRule[]) => void;
}

const OPERATORS = ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_set', 'is_not_set', 'gt', 'lt', 'gte', 'lte'];

export function JumpEditor({ rules, steps, onChange }: JumpEditorProps) {
  const addRule = () => {
    const newRule: JumpRule = {
      id: uuid(),
      target: steps[0]?.id || 'exit',
    };
    onChange([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<JumpRule>) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  };

  const setCondition = (ruleId: string, condition: JumpRuleCondition | undefined) => {
    updateRule(ruleId, { condition });
  };

  const addConditionRule = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const newCondRule: JumpRuleConditionRule = {
      variable: '',
      operator: 'equals',
      value: '',
    };

    if (rule.condition) {
      setCondition(ruleId, {
        ...rule.condition,
        rules: [...rule.condition.rules, newCondRule],
      });
    } else {
      setCondition(ruleId, {
        logic: 'AND',
        rules: [newCondRule],
      });
    }
  };

  const updateConditionRule = (
    ruleId: string,
    index: number,
    updates: Partial<JumpRuleConditionRule>
  ) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule?.condition) return;

    const updatedRules = rule.condition.rules.map((cr, i) =>
      i === index ? { ...cr, ...updates } : cr
    );
    setCondition(ruleId, { ...rule.condition, rules: updatedRules });
  };

  const deleteConditionRule = (ruleId: string, index: number) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule?.condition) return;

    const updatedRules = rule.condition.rules.filter((_, i) => i !== index);
    if (updatedRules.length === 0) {
      setCondition(ruleId, undefined);
    } else {
      setCondition(ruleId, { ...rule.condition, rules: updatedRules });
    }
  };

  const toggleConditionLogic = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule?.condition) return;
    setCondition(ruleId, {
      ...rule.condition,
      logic: rule.condition.logic === 'AND' ? 'OR' : 'AND',
    });
  };

  const getTargetLabel = (target: JumpTarget): string => {
    if (target === 'exit') return 'Exit conversation';
    if (target === 'url') return 'Redirect to URL';
    const step = steps.find((s) => s.id === target);
    return step ? `Step ${step.number}: ${step.name}` : 'Unknown step';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Jump Rules</h3>
        <Button size="sm" variant="outline" onClick={addRule} className="h-7 gap-1">
          <Plus className="h-3 w-3" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No jump rules. The conversation will end after this step.
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded-lg p-3 space-y-3">
            {/* Trigger */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Trigger</span>
              <Input
                value={rule.trigger || ''}
                onChange={(e) => updateRule(rule.id, { trigger: e.target.value })}
                placeholder="Any answer (leave empty for default)"
                className="text-sm h-8 flex-1"
              />
              <button
                className="p-1.5 rounded text-destructive hover:bg-muted"
                onClick={() => deleteRule(rule.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Target */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Target</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-between text-xs h-8">
                    <span className="flex items-center gap-1.5 truncate">
                      {rule.target === 'exit' ? (
                        <LogOut className="h-3 w-3" />
                      ) : rule.target === 'url' ? (
                        <Link2 className="h-3 w-3" />
                      ) : (
                        <CornerDownRight className="h-3 w-3" />
                      )}
                      {getTargetLabel(rule.target)}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                  {steps.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => updateRule(rule.id, { target: s.id })}
                    >
                      <CornerDownRight className="h-3 w-3 mr-2" />
                      Step {s.number}: {s.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => updateRule(rule.id, { target: 'exit' })}>
                    <LogOut className="h-3 w-3 mr-2" />
                    Exit conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateRule(rule.id, { target: 'url' })}>
                    <Link2 className="h-3 w-3 mr-2" />
                    Redirect to URL
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* URL target options */}
            {rule.target === 'url' && (
              <div className="flex items-center gap-2 pl-[76px]">
                <Input
                  value={(rule as JumpRule & { url?: string }).url || ''}
                  onChange={(e) => updateRule(rule.id, { ...rule, url: e.target.value } as Partial<JumpRule>)}
                  placeholder="https://..."
                  className="text-sm h-8 flex-1"
                />
                <div className="flex gap-1">
                  {(['same_tab', 'new_tab', 'new_window'] as JumpUrlTarget[]).map((ut) => (
                    <Button
                      key={ut}
                      size="sm"
                      variant={rule.urlTarget === ut ? 'default' : 'outline'}
                      onClick={() => updateRule(rule.id, { urlTarget: ut })}
                      className="text-xs h-7"
                    >
                      {ut.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions */}
            <div className="border-t pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Conditions</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => addConditionRule(rule.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>

              {rule.condition && rule.condition.rules.length > 0 && (
                <div className="space-y-1.5">
                  {rule.condition.rules.map((cr, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <button
                          className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20"
                          onClick={() => toggleConditionLogic(rule.id)}
                        >
                          {rule.condition!.logic}
                        </button>
                      )}
                      {idx === 0 && <span className="text-xs w-8">If</span>}
                      <Input
                        value={cr.variable}
                        onChange={(e) =>
                          updateConditionRule(rule.id, idx, { variable: e.target.value })
                        }
                        placeholder="Variable"
                        className="text-xs h-7 flex-1"
                      />
                      <select
                        value={cr.operator}
                        onChange={(e) =>
                          updateConditionRule(rule.id, idx, { operator: e.target.value })
                        }
                        className="text-xs h-7 border rounded px-1 bg-background"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op} value={op}>
                            {op.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={cr.value}
                        onChange={(e) =>
                          updateConditionRule(rule.id, idx, { value: e.target.value })
                        }
                        placeholder="Value"
                        className="text-xs h-7 flex-1"
                      />
                      <button
                        className="p-1 rounded text-destructive hover:bg-muted"
                        onClick={() => deleteConditionRule(rule.id, idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
