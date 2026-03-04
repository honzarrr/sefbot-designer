'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  fetchOrganizations,
  createOrganization,
  renameOrganization,
  deleteOrganization,
  fetchChatbots,
  createChatbot,
  updateChatbot,
  deleteChatbot,
  duplicateChatbot,
  restoreChatbot,
  fetchTrashedChatbots,
  importFromProject,
} from '@/lib/chatbot-api';
import { fetchProjectList, type ProjectListItemWithLock } from '@/lib/api-storage';
import { Organization, ChatbotListItem } from '@/types/chatbot';
import { AppHeader } from '@/components/shared/AppHeader';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  RotateCcw,
  FolderPlus,
  Bot,
  Building2,
  ArrowRightLeft,
  Upload,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export default function ChatbotsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [chatbots, setChatbots] = useState<ChatbotListItem[]>([]);
  const [trashedByOrg, setTrashedByOrg] = useState<Record<string, ChatbotListItem[]>>({});
  const [projects, setProjects] = useState<ProjectListItemWithLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState<Set<string>>(new Set());

  // Dialogs
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [renameOrgOpen, setRenameOrgOpen] = useState(false);
  const [renameOrgTarget, setRenameOrgTarget] = useState<{ id: string; name: string } | null>(null);
  const [createBotOpen, setCreateBotOpen] = useState(false);
  const [createBotOrgId, setCreateBotOrgId] = useState('');
  const [newBotName, setNewBotName] = useState('');
  const [renameBotOpen, setRenameBotOpen] = useState(false);
  const [renameBotTarget, setRenameBotTarget] = useState<{ id: string; name: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importBotId, setImportBotId] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBotTarget, setMoveBotTarget] = useState<{ id: string; currentOrgId: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [orgData, botData, projectData] = await Promise.all([
        fetchOrganizations(),
        fetchChatbots(),
        fetchProjectList(),
      ]);
      setOrgs(orgData);
      setChatbots(botData);
      setProjects(projectData);
      // Expand all orgs by default
      setExpandedOrgs(new Set(orgData.map((o) => o.id)));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTrash = async (orgId: string) => {
    try {
      const trashed = await fetchTrashedChatbots(orgId);
      setTrashedByOrg((prev) => ({ ...prev, [orgId]: trashed }));
    } catch (e) {
      console.error('Failed to load trash:', e);
    }
  };

  const toggleTrash = (orgId: string) => {
    setShowTrash((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
        loadTrash(orgId);
      }
      return next;
    });
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    await createOrganization(newOrgName.trim());
    setNewOrgName('');
    setCreateOrgOpen(false);
    loadData();
    toast.success('Organization created.');
  };

  const handleRenameOrg = async () => {
    if (!renameOrgTarget?.name.trim()) return;
    await renameOrganization(renameOrgTarget.id, renameOrgTarget.name.trim());
    setRenameOrgTarget(null);
    setRenameOrgOpen(false);
    loadData();
    toast.success('Organization renamed.');
  };

  const handleDeleteOrg = async (id: string) => {
    try {
      await deleteOrganization(id);
      loadData();
      toast.success('Organization deleted.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreateBot = async () => {
    if (!newBotName.trim() || !createBotOrgId) return;
    const bot = await createChatbot(newBotName.trim(), createBotOrgId);
    setNewBotName('');
    setCreateBotOpen(false);
    router.push(`/chatbots/${bot.id}/edit`);
  };

  const handleRenameBot = async () => {
    if (!renameBotTarget?.name.trim()) return;
    await updateChatbot(renameBotTarget.id, { name: renameBotTarget.name.trim() });
    setRenameBotTarget(null);
    setRenameBotOpen(false);
    loadData();
    toast.success('Chatbot renamed.');
  };

  const handleDeleteBot = async (id: string) => {
    await deleteChatbot(id);
    loadData();
    toast.success('Moved to trash.');
  };

  const handleDuplicateBot = async (id: string) => {
    await duplicateChatbot(id);
    loadData();
    toast.success('Chatbot duplicated.');
  };

  const handleRestoreBot = async (id: string) => {
    await restoreChatbot(id);
    loadData();
    toast.success('Chatbot restored.');
    // Reload trash for all visible trash sections
    Array.from(showTrash).forEach((orgId) => loadTrash(orgId));
  };

  const handleImport = async (projectId: string) => {
    if (!importBotId) return;
    await importFromProject(importBotId, projectId);
    setImportOpen(false);
    setImportBotId('');
    loadData();
    toast.success('Import complete.');
  };

  const handleMoveBot = async (targetOrgId: string) => {
    if (!moveBotTarget) return;
    // Move is done by updating the chatbot's organizationId
    // The API PUT supports updating organizationId through direct body
    const res = await fetch(`/api/chatbots/${moveBotTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: targetOrgId }),
    });
    if (!res.ok) {
      toast.error('Failed to move chatbot.');
      return;
    }
    setMoveBotTarget(null);
    setMoveOpen(false);
    loadData();
    toast.success('Chatbot moved.');
  };

  const toggleOrg = (orgId: string) => {
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const filteredChatbots = chatbots.filter((b) =>
    b.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diff = 30 - Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Toolbar */}
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chatbots..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Button onClick={() => setCreateOrgOpen(true)} variant="outline">
          <FolderPlus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {loading && (
          <div className="text-center text-muted-foreground py-12">Loading...</div>
        )}

        {!loading && orgs.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No organizations yet</h2>
            <p className="text-muted-foreground mb-4">Create an organization to start building chatbots.</p>
            <Button onClick={() => setCreateOrgOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {orgs.map((org) => {
            const orgBots = filteredChatbots.filter((b) => b.organizationId === org.id);
            const isExpanded = expandedOrgs.has(org.id);
            const trashVisible = showTrash.has(org.id);
            const trashed = trashedByOrg[org.id] || [];

            return (
              <div key={org.id} className="border rounded-lg">
                {/* Org Header */}
                <div className="flex items-center gap-3 p-4 bg-muted/30">
                  <button onClick={() => toggleOrg(org.id)} className="p-0.5">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{org.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {org.chatbotCount} chatbot{org.chatbotCount !== 1 ? 's' : ''}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCreateBotOrgId(org.id);
                        setCreateBotOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Chatbot
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameOrgTarget({ id: org.id, name: org.name });
                            setRenameOrgOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleTrash(org.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {trashVisible ? 'Hide Trash' : 'Show Trash'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteOrg(org.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Organization
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chatbot List */}
                {isExpanded && (
                  <div className="divide-y">
                    {orgBots.length === 0 && !trashVisible && (
                      <div className="px-4 py-8 text-center">
                        <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">Create your first chatbot</p>
                        <p className="text-xs text-muted-foreground mb-3">Build and deploy interactive chatbots for your website.</p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateBotOrgId(org.id);
                            setCreateBotOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          New Chatbot
                        </Button>
                      </div>
                    )}
                    {orgBots.map((bot) => (
                      <div
                        key={bot.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer group"
                        onClick={() => router.push(`/chatbots/${bot.id}/edit`)}
                      >
                        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm flex-1 truncate">{bot.name}</span>
                        {bot.active && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                        )}
                        {bot.projectId && (
                          <Badge variant="outline" className="text-xs">Linked</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(bot.updatedAt)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/chatbots/${bot.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameBotTarget({ id: bot.id, name: bot.name });
                                setRenameBotOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateBot(bot.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setMoveBotTarget({ id: bot.id, currentOrgId: bot.organizationId });
                                setMoveOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-2" />
                              Move to...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setImportBotId(bot.id);
                                setImportOpen(true);
                              }}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Import from Project
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteBot(bot.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}

                    {/* Trash Section */}
                    {trashVisible && trashed.length > 0 && (
                      <div className="bg-red-50/50 dark:bg-red-900/10">
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Trash (auto-deletes after 30 days)
                        </div>
                        {trashed.map((bot) => (
                          <div
                            key={bot.id}
                            className="flex items-center gap-3 px-4 py-2 text-muted-foreground"
                          >
                            <Bot className="h-4 w-4 shrink-0 opacity-50" />
                            <span className="text-sm flex-1 truncate line-through">{bot.name}</span>
                            <Badge variant="outline" className="text-xs text-orange-600">
                              {getDaysRemaining(bot.deletedAt!)} days left
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreBot(bot.id)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {trashVisible && trashed.length === 0 && (
                      <div className="bg-red-50/50 dark:bg-red-900/10 px-4 py-4 text-center text-sm text-muted-foreground">
                        Trash is empty.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Org Dialog */}
      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={!newOrgName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Org Dialog */}
      <Dialog open={renameOrgOpen} onOpenChange={setRenameOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Organization</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Organization name"
              value={renameOrgTarget?.name ?? ''}
              onChange={(e) =>
                setRenameOrgTarget((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleRenameOrg()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameOrg} disabled={!renameOrgTarget?.name.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Chatbot Dialog */}
      <Dialog open={createBotOpen} onOpenChange={setCreateBotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Chatbot</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Chatbot name"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBot()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBotOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBot} disabled={!newBotName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Chatbot Dialog */}
      <Dialog open={renameBotOpen} onOpenChange={setRenameBotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chatbot</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Chatbot name"
              value={renameBotTarget?.name ?? ''}
              onChange={(e) =>
                setRenameBotTarget((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleRenameBot()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameBotOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameBot} disabled={!renameBotTarget?.name.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Project Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from Designer Project</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80 py-4">
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm"
                  onClick={() => handleImport(p.id)}
                >
                  {p.name}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({p.status})
                  </span>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No projects found.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Move Chatbot Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Chatbot to Organization</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-1">
            {orgs
              .filter((o) => o.id !== moveBotTarget?.currentOrgId)
              .map((org) => (
                <button
                  key={org.id}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted text-sm flex items-center gap-2"
                  onClick={() => handleMoveBot(org.id)}
                >
                  <Building2 className="h-4 w-4" />
                  {org.name}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
