'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, MoreHorizontal, Trash2, Shield, ShieldOff, KeyRound, Copy } from 'lucide-react';
import { AppHeader } from '@/components/shared/AppHeader';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '', role: 'EDITOR' });
  const [inviteResult, setInviteResult] = useState<{ inviteLink: string } | null>(null);
  const [error, setError] = useState('');

  const isAdmin = session?.user?.role === 'ADMIN';

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleInvite = async () => {
    setError('');
    if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim() || !inviteForm.email.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to invite user');
        return;
      }

      const data = await res.json();
      setInviteResult({ inviteLink: data.inviteLink });
      loadUsers();
    } catch {
      setError('Failed to invite user');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch {
      // ignore
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'EDITOR' : 'ADMIN';
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change role');
      }
    } catch {
      // ignore
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${window.location.origin}${data.resetLink}`;
        await navigator.clipboard.writeText(fullUrl).catch(() => {});
        alert(`Password reset link (copied to clipboard):\n${fullUrl}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset password');
      }
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const closeInviteDialog = () => {
    setInviteOpen(false);
    setInviteForm({ firstName: '', lastName: '', email: '', role: 'EDITOR' });
    setInviteResult(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">User Management</h2>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} disabled={users.length >= 30}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User {users.length >= 30 ? '(max reached)' : ''}
          </Button>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Loading users...</div>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3">Created</th>
                  {isAdmin && (
                    <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleRole(user.id, user.role)}>
                              {user.role === 'ADMIN' ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Demote to Editor
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Promote to Admin
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          {users.length} / 30 users
        </div>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={closeInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inviteResult ? 'User Invited' : 'Invite New User'}</DialogTitle>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Share this registration link with the user:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${inviteResult.inviteLink}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}${inviteResult.inviteLink}`;
                    navigator.clipboard.writeText(fullUrl);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeInviteDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="flex gap-2">
                  <Button
                    variant={inviteForm.role === 'EDITOR' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInviteForm((f) => ({ ...f, role: 'EDITOR' }))}
                  >
                    Editor
                  </Button>
                  <Button
                    variant={inviteForm.role === 'ADMIN' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInviteForm((f) => ({ ...f, role: 'ADMIN' }))}
                  >
                    Admin
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInviteDialog}>
                  Cancel
                </Button>
                <Button onClick={handleInvite}>Send Invite</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
