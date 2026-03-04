'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Upload, Users, LogOut, Bot } from 'lucide-react';

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'ADMIN';

  const navItems = [
    { href: '/', label: 'Projects', icon: FolderOpen },
    { href: '/chatbots', label: 'Chatbots', icon: Bot },
    { href: '/import', label: 'Import', icon: Upload },
  ];

  if (isAdmin) {
    navItems.push({ href: '/admin/users', label: 'Users', icon: Users });
  }

  return (
    <header className="border-b px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-lg font-bold tracking-tight cursor-pointer"
            onClick={() => router.push('/')}
          >
            Sefbot Designer
          </h1>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.href === '/'
                ? (pathname ?? '') === '/'
                : (pathname ?? '').startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{session?.user?.name}</span>
            <Badge variant="secondary" className="text-xs">
              {session?.user?.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
