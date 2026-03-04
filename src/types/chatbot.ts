// === STEP TYPES ===
export enum StepType {
  Button = 'button',
  Carousel = 'carousel',
  Email = 'email',
  Phone = 'phone',
  Location = 'location',
  Answer = 'answer',
  Logic = 'logic',
  Calendar = 'calendar',
  Stars = 'stars',
  File = 'file',
}

// === OUTPUT BLOCKS ===
export type OutputBlockType = 'text' | 'html' | 'info' | 'warning' | 'image' | 'video';

export interface OutputBlock {
  id: string;
  type: OutputBlockType;
  content: string;
}

// === INPUT TYPES ===
export type ButtonDisplayMode = 'list' | 'grid';

export interface ButtonInputItem {
  id: string;
  text: string;
  icon?: string;
  highlighted?: boolean;
  displayMode: ButtonDisplayMode;
}

export interface ButtonInput {
  buttons: ButtonInputItem[];
}

export interface CarouselInputItem {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonText: string;
}

export interface CarouselInput {
  items: CarouselInputItem[];
}

export interface EmailInput {
  placeholder: string;
}

export interface PhoneInput {
  placeholder: string;
  requirePrefix: boolean;
}

export type LocationProvider = 'google' | 'mapy_cz';

export interface LocationInput {
  provider: LocationProvider;
  countryLimit?: string;
  placeholder: string;
}

export interface AnswerInput {
  placeholder: string;
  sendOnEnter: boolean;
  optional: boolean;
  numbersOnly: boolean;
  units?: string;
  decimals?: boolean;
  thousandsSeparator?: boolean;
}

export type LogicAnswerValue = 'text' | 'variable';

export interface LogicInput {
  answerValue: LogicAnswerValue;
}

export interface CalendarInput {
  allowPast: boolean;
  futureDaysLimit: number;
  startMonday: boolean;
}

export interface StarsInput {
  icon: string;
  count: number;
  confirmButtonText: string;
}

export interface FileInput {
  allowCamera: boolean;
}

export type StepInput =
  | ButtonInput
  | CarouselInput
  | EmailInput
  | PhoneInput
  | LocationInput
  | AnswerInput
  | LogicInput
  | CalendarInput
  | StarsInput
  | FileInput;

// === JUMP RULES ===
export type LogicOperator = 'AND' | 'OR';

export interface JumpRuleConditionRule {
  variable: string;
  operator: string;
  value: string;
}

export interface JumpRuleCondition {
  logic: LogicOperator;
  rules: JumpRuleConditionRule[];
}

export type JumpTarget = string | 'exit' | 'url';

export type JumpUrlTarget = 'same_tab' | 'new_tab' | 'new_window';

export interface JumpRule {
  id: string;
  condition?: JumpRuleCondition;
  trigger?: string;
  target: JumpTarget;
  urlTarget?: JumpUrlTarget;
}

// === CHATBOT SETTINGS ===
export type WidgetPosition = 'right' | 'center' | 'full';
export type SmartStartAnimation = 'bounce' | 'pulse' | 'shake' | 'none';
export type ConversionType = 'chatbot_open' | 'redirect' | 'phone' | 'email';

export interface WorkHours {
  start: string; // "08:00"
  end: string;   // "17:00"
  days: number[]; // 0=Sun..6=Sat, default [1,2,3,4,5]
}

export interface DesignColors {
  theme?: string;
  hover?: string;
  messageBg?: string;
  messageText?: string;
  inverse?: string;
  avatar?: string;
  error?: string;
}

export interface SmartStartDefault {
  avatar?: string;
  animation?: SmartStartAnimation;
  text?: string;
  buttonText?: string;
  delay?: number;
  mainAvatar?: string;
}

export interface SmartStartCondition {
  id: string;
  phase: 'pre_init' | 'post_init';
  logic: LogicOperator;
  rules: JumpRuleConditionRule[];
  startingStepId?: string;
}

export interface ConversionItem {
  id: string;
  name: string;
  type: ConversionType;
}

export interface DefaultResponse {
  key: string; // 'invalid' | 'missing' | 'nothing_found'
  messages: Record<string, string>; // lang -> message
}

export interface CustomVariable {
  id: string;
  name: string;
  source: 'script';
}

export interface ChatbotSettings {
  // MAIN
  name?: string;
  welcomeMessage?: string;
  languages?: string[];
  workHours?: WorkHours;
  // DESIGN
  design?: {
    colors?: DesignColors;
    position?: WidgetPosition;
    closeButton?: boolean;
    background?: string;
  };
  // SMART START
  smartStart?: SmartStartDefault;
  smartStartConditions?: SmartStartCondition[];
  // CONVERSIONS
  conversions?: ConversionItem[];
  // DEFAULT RESPONSES
  defaultResponses?: DefaultResponse[];
  // VARIABLES
  customVariables?: CustomVariable[];
  // Legacy compat
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
  };
  [key: string]: unknown;
}

// === ORGANIZATION ===
export interface Organization {
  id: string;
  name: string;
  chatbotCount: number;
  createdAt: string;
}

// === CHATBOT STEP (full) ===
export interface ChatbotStepData {
  id: string;
  chatbotId?: string;
  projectId?: string;
  sourceBlockId?: string;
  number: number;
  name: string;
  type: StepType | string;
  color: string;
  output: OutputBlock[];
  input: StepInput;
  jump: JumpRule[];
  settings: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// === CHATBOT ===
export interface ChatbotListItem {
  id: string;
  name: string;
  organizationId: string;
  active: boolean;
  deletedAt: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotData {
  id: string;
  name: string;
  organizationId: string;
  active: boolean;
  deletedAt: string | null;
  settings: ChatbotSettings | null;
  projectId: string | null;
  steps: ChatbotStepData[];
  createdAt: string;
  updatedAt: string;
}

// === CHATBOT VERSION ===
export interface ChatbotVersionData {
  id: string;
  chatbotId: string;
  snapshot: unknown;
  changes: string | null;
  createdBy: string;
  createdAt: string;
}

// === NOTIFICATION ===
export type NotificationType = 'email' | 'webhook' | 'slack' | 'sms';

export interface NotificationConfig {
  recipients?: string[];
  webhookUrl?: string;
  slackChannel?: string;
  template?: string;
  [key: string]: unknown;
}

export interface NotificationConditions {
  stepId?: string;
  event?: string;
  [key: string]: unknown;
}

export interface NotificationData {
  id: string;
  chatbotId: string;
  name: string;
  type: NotificationType | string;
  active: boolean;
  config: NotificationConfig;
  conditions: NotificationConditions | null;
  createdAt: string;
  updatedAt: string;
}
