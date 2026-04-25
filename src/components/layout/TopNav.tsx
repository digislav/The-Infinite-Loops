'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  FileText,
  User as UserIcon,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { NavItem } from './NavItem';
import { ReminderBell } from './ReminderBell';
import { BrandLogo } from './BrandLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/documents', label: 'Document Library', icon: <FileText size={16} /> },
  { href: '/profile', label: 'Profile', icon: <UserIcon size={16} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={16} /> },
];

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="decoration-primary flex items-center gap-3 transition-opacity hover:underline"
          >
            <BrandLogo className="h-10 w-32" />
            <span className="text-foreground text-xl font-bold">The Infinite Loops</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavItem key={link.href} href={link.href} label={link.label} icon={link.icon} />
            ))}
          </nav>

          {/* Right side — bell + user menu */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex">
              <ReminderBell />
            </div>
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                className={cn('hidden md:flex', accountOpen && 'bg-accent')}
                onClick={() => setAccountOpen(!accountOpen)}
                aria-label="User menu"
              >
                <UserIcon size={18} />
                <span className="ml-2 text-sm font-medium">Account</span>
              </Button>

              {accountOpen && (
                <div className="bg-popover animate-in fade-in zoom-in absolute right-0 mt-2 w-56 origin-top-right rounded-md border p-2 shadow-lg duration-200">
                  <div className="px-2 py-1.5">
                    <p className="text-muted-foreground text-xs font-medium">Logged in as</p>
                    <p className="truncate text-sm font-semibold">{user?.email || 'Loading...'}</p>
                  </div>
                  <div className="my-1 border-t" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground w-full justify-start hover:text-red-500"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} className="mr-2" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile hamburger button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={cn('border-t pb-4 md:hidden', mobileMenuOpen ? 'block' : 'hidden')}>
          <nav className="flex flex-col gap-1 pt-4" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <NavItem key={link.href} href={link.href} label={link.label} icon={link.icon} />
            ))}
            <div className="my-2 border-t" />
            <div className="px-4 py-2">
              <p className="text-muted-foreground text-xs font-medium">Logged in as</p>
              <p className="truncate text-sm font-semibold">{user?.email || 'Loading...'}</p>
            </div>
            <div className="px-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-full justify-start hover:text-red-500"
                onClick={handleSignOut}
              >
                <LogOut size={16} className="mr-2" />
                <span className="text-sm font-medium">Sign Out</span>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
