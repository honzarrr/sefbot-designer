import {
  ChatbotListItem,
  ChatbotData,
  ChatbotStepData,
  ChatbotSettings,
  NotificationData,
  ChatbotVersionData,
  Organization,
} from '@/types/chatbot';

// === ORGANIZATIONS ===

export async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch('/api/organizations');
  if (!res.ok) throw new Error('Failed to load organizations');
  return res.json();
}

export async function createOrganization(name: string): Promise<Organization> {
  const res = await fetch('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create organization');
  return res.json();
}

export async function renameOrganization(id: string, name: string): Promise<void> {
  const res = await fetch(`/api/organizations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to rename organization');
}

export async function deleteOrganization(id: string): Promise<void> {
  const res = await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete organization');
  }
}

// === CHATBOTS ===

export async function fetchChatbots(organizationId?: string): Promise<ChatbotListItem[]> {
  const url = organizationId
    ? `/api/chatbots?organizationId=${organizationId}`
    : '/api/chatbots';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load chatbots');
  return res.json();
}

export async function fetchChatbot(id: string): Promise<ChatbotData> {
  const res = await fetch(`/api/chatbots/${id}`);
  if (!res.ok) throw new Error('Failed to load chatbot');
  return res.json();
}

export async function createChatbot(name: string, organizationId: string): Promise<ChatbotListItem> {
  const res = await fetch('/api/chatbots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, organizationId }),
  });
  if (!res.ok) throw new Error('Failed to create chatbot');
  return res.json();
}

export async function updateChatbot(id: string, data: { name?: string; active?: boolean }): Promise<ChatbotListItem> {
  const res = await fetch(`/api/chatbots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update chatbot');
  return res.json();
}

export async function deleteChatbot(id: string): Promise<void> {
  const res = await fetch(`/api/chatbots/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete chatbot');
}

export async function restoreChatbot(id: string): Promise<void> {
  const res = await fetch(`/api/chatbots/${id}/restore`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restore chatbot');
}

export async function duplicateChatbot(id: string): Promise<ChatbotListItem> {
  const res = await fetch(`/api/chatbots/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate chatbot');
  return res.json();
}

export async function fetchTrashedChatbots(organizationId: string): Promise<ChatbotListItem[]> {
  const res = await fetch(`/api/chatbots/${organizationId}/trash`);
  if (!res.ok) throw new Error('Failed to load trash');
  return res.json();
}

export async function importFromProject(chatbotId: string, projectId: string): Promise<{ imported: number }> {
  const res = await fetch(`/api/chatbots/${chatbotId}/import-from-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (!res.ok) throw new Error('Failed to import from project');
  return res.json();
}

// === STEPS ===

export async function createStep(
  chatbotId: string,
  data: { name: string; type: string; color?: string }
): Promise<ChatbotStepData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create step');
  return res.json();
}

export async function updateStep(
  chatbotId: string,
  stepId: string,
  data: Partial<ChatbotStepData>
): Promise<ChatbotStepData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps/${stepId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update step');
  return res.json();
}

export async function deleteStep(chatbotId: string, stepId: string): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps/${stepId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete step');
}

export async function duplicateStep(chatbotId: string, stepId: string): Promise<ChatbotStepData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps/${stepId}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate step');
  return res.json();
}

export async function reorderSteps(
  chatbotId: string,
  order: { id: string; sortOrder: number }[]
): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });
  if (!res.ok) throw new Error('Failed to reorder steps');
}

export async function bulkColorSteps(
  chatbotId: string,
  stepIds: string[],
  color: string
): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/steps/bulk-color`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepIds, color }),
  });
  if (!res.ok) throw new Error('Failed to update colors');
}

// === SETTINGS ===

export async function fetchSettings(chatbotId: string): Promise<ChatbotSettings> {
  const res = await fetch(`/api/chatbots/${chatbotId}/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  const data = await res.json();
  return data.settings;
}

export async function saveSettings(chatbotId: string, settings: ChatbotSettings): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
}

export async function fetchEmbedCode(chatbotId: string): Promise<string> {
  const res = await fetch(`/api/chatbots/${chatbotId}/embed-code`);
  if (!res.ok) throw new Error('Failed to load embed code');
  const data = await res.json();
  return data.embedCode;
}

// === NOTIFICATIONS ===

export async function fetchNotifications(chatbotId: string): Promise<NotificationData[]> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications`);
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

export async function createNotification(
  chatbotId: string,
  data: { name: string; type: string; config?: Record<string, unknown>; conditions?: Record<string, unknown> | null }
): Promise<NotificationData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create notification');
  return res.json();
}

export async function updateNotification(
  chatbotId: string,
  notifId: string,
  data: Partial<NotificationData>
): Promise<NotificationData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications/${notifId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update notification');
  return res.json();
}

export async function deleteNotification(chatbotId: string, notifId: string): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications/${notifId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete notification');
}

export async function toggleNotification(chatbotId: string, notifId: string): Promise<void> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications/${notifId}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle notification');
}

export async function duplicateNotification(chatbotId: string, notifId: string): Promise<NotificationData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/notifications/${notifId}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate notification');
  return res.json();
}

// === VERSIONS ===

export async function fetchVersions(chatbotId: string): Promise<ChatbotVersionData[]> {
  const res = await fetch(`/api/chatbots/${chatbotId}/versions`);
  if (!res.ok) throw new Error('Failed to load versions');
  return res.json();
}

export async function createVersion(chatbotId: string, changes?: string): Promise<ChatbotVersionData> {
  const res = await fetch(`/api/chatbots/${chatbotId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
  });
  if (!res.ok) throw new Error('Failed to create version');
  return res.json();
}

// === PREVIEW ===

export async function generatePreviewLink(chatbotId: string): Promise<{ token: string; previewUrl: string }> {
  const res = await fetch(`/api/chatbots/${chatbotId}/preview-link`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate preview link');
  return res.json();
}
