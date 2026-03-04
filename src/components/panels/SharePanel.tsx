'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Link2,
  Copy,
  Trash2,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Share {
  id: string;
  token: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface NewShareResult {
  shareUrl: string;
  token: string;
  password: string;
  expiresAt: string | null;
}

function generateRandomPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    result += chars[byte % chars.length];
  }
  return result;
}

export function SharePanel() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('id') ?? null;

  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newShare, setNewShare] = useState<NewShareResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const fetchShares = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`);
      if (res.ok) {
        setShares(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleGenerate = async () => {
    if (!projectId || !password || password.length < 6) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          expiresAt: expiresAt || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewShare(data);
        setPassword('');
        setExpiresAt('');
        fetchShares();
        toast.success('Share link created.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!projectId) return;
    await fetch(`/api/projects/${projectId}/share/${token}`, {
      method: 'DELETE',
    });
    fetchShares();
  };

  const copyToClipboard = async (text: string, type: 'url' | 'pwd') => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard.');
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPwd(true);
      setTimeout(() => setCopiedPwd(false), 2000);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Generate new share link */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Generate Share Link
        </h3>

        <div className="space-y-2">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars) *"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 pr-8"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>

          <button
            onClick={() => setPassword(generateRandomPassword())}
            className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Generate Random
          </button>

          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 text-gray-600"
            placeholder="Expiration (optional)"
          />

          <button
            onClick={handleGenerate}
            disabled={generating || !password || password.length < 6}
            className="w-full text-xs bg-blue-500 text-white rounded py-1.5 font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Link2 className="w-3 h-3" />
            {generating ? 'Generating...' : 'Generate Link'}
          </button>
        </div>
      </div>

      {/* Newly generated share */}
      {newShare && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-green-700">Share link created!</p>

          <div className="space-y-1">
            <label className="text-[10px] text-green-600 font-medium">URL:</label>
            <div className="flex gap-1">
              <input
                readOnly
                value={newShare.shareUrl}
                className="flex-1 text-[10px] bg-white border border-green-200 rounded px-2 py-1"
              />
              <button
                onClick={() => copyToClipboard(newShare.shareUrl, 'url')}
                className="px-2 py-1 bg-white border border-green-200 rounded text-green-600 hover:bg-green-50"
              >
                {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-green-600 font-medium">Password:</label>
            <div className="flex gap-1">
              <input
                readOnly
                value={newShare.password}
                className="flex-1 text-[10px] bg-white border border-green-200 rounded px-2 py-1 font-mono"
              />
              <button
                onClick={() => copyToClipboard(newShare.password, 'pwd')}
                className="px-2 py-1 bg-white border border-green-200 rounded text-green-600 hover:bg-green-50"
              >
                {copiedPwd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setNewShare(null)}
            className="text-[10px] text-green-600 hover:text-green-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active shares */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Active Shares
        </h3>

        {loading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : shares.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400">Share this project with your client.</p>
            <p className="text-[10px] text-gray-300 mt-1">Generate a link to let others view your chatbot design.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className={`text-xs border rounded-lg p-2.5 ${
                  share.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-500">
                    ...{share.token.slice(-8)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      share.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {share.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {share.isActive && (
                      <button
                        onClick={() => handleRevoke(share.token)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Revoke"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>Created {new Date(share.createdAt).toLocaleDateString()}</span>
                  {share.expiresAt && (
                    <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
