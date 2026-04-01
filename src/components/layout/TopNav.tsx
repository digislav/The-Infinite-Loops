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
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <svg width="124" height="124" viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker
                  id="arrowhead"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M2 1L8 5L2 9"
                    fill="none"
                    stroke="#2E75B6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>
              <path
                d="M 340 30 C 430 30, 500 80, 500 110 C 500 150, 440 185, 340 185 C 240 185, 180 150, 180 110 C 180 70, 250 30, 338 30"
                fill="none"
                stroke="#2E75B6"
                strokeWidth="7"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
              />
              <line
                x1="280"
                y1="70"
                x2="330"
                y2="70"
                stroke="#1F4E79"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <line
                x1="305"
                y1="70"
                x2="305"
                y2="150"
                stroke="#1F4E79"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <line
                x1="350"
                y1="70"
                x2="400"
                y2="70"
                stroke="#1F4E79"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <line
                x1="350"
                y1="150"
                x2="400"
                y2="150"
                stroke="#1F4E79"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <line
                x1="375"
                y1="70"
                x2="375"
                y2="150"
                stroke="#1F4E79"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-foreground text-xl font-bold">The Infinite Loops</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <NavItem key={link.href} href={link.href} label={link.label} icon={link.icon} />
            ))}
          </nav>

          {/* Right side — user menu */}
          <div className="flex items-center gap-4">
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
