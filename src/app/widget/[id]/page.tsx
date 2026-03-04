'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WidgetTestPage() {
  const params = useParams() ?? {};
  const chatbotId = (params?.id as string) || '';
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!chatbotId || !origin) return;

    // Inject the widget script into this page
    const existing = document.querySelector('script[data-chatbot-id]');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = origin + '/embed/sefbot-widget.js';
    script.dataset.chatbotId = chatbotId;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      const host = document.getElementById('sefbot-widget-host');
      if (host) host.remove();
    };
  }, [chatbotId, origin]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 12,
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#333' }}>
          Widget Test Page
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          The chat widget for chatbot <code style={{
            background: '#f0f0f0',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 13,
          }}>{chatbotId}</code> is loaded on this page.
          Look for the chat bubble in the bottom-right corner.
        </p>

        <div style={{
          background: '#f8f9fa',
          borderRadius: 8,
          padding: '16px',
          marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#333' }}>
            Embed Code
          </h3>
          <pre style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '12px 16px',
            borderRadius: 6,
            fontSize: 12,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
{`<script src="${origin}/embed/sefbot-widget.js" data-chatbot-id="${chatbotId}"></script>`}
          </pre>
        </div>

        <div style={{
          background: '#f0f7ff',
          borderRadius: 8,
          padding: '12px 16px',
          fontSize: 13,
          color: '#2563eb',
          lineHeight: 1.5,
        }}>
          This page simulates how the widget appears on an external website.
          The widget loads its configuration from the runtime API and runs independently.
        </div>
      </div>
    </div>
  );
}
