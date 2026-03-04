'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { fetchChatbot } from '@/lib/chatbot-api';
import { ChatbotData } from '@/types/chatbot';
import { AppHeader } from '@/components/shared/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Settings,
  Bell,
  BarChart3,
  Play,
  ArrowLeft,
} from 'lucide-react';

const TABS = [
  { key: 'edit', label: 'Edit', icon: Pencil },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'preview', label: 'Preview', icon: Play },
];

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams() ?? {};
  const pathname = usePathname();
  const router = useRouter();
  const chatbotId = (params?.id as string) || '';
  const [chatbot, setChatbot] = useState<ChatbotData | null>(null);

  useEffect(() => {
    fetchChatbot(chatbotId).then(setChatbot).catch(console.error);
  }, [chatbotId]);

  const activeTab = TABS.find((t) => (pathname ?? '').includes(`/${t.key}`))?.key || 'edit';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Chatbot sub-header */}
      <div className="border-b px-6 py-2 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/chatbots')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Chatbots
        </Button>
        <div className="h-5 w-px bg-border" />
        {chatbot && (
          <>
            <span className="font-semibold text-sm">{chatbot.name}</span>
            {chatbot.active && (
              <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
            )}
          </>
        )}
        <nav className="ml-auto flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => router.push(`/chatbots/${chatbotId}/${tab.key}`)}
                className="gap-1.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
