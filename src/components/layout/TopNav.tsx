'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, User, Settings, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { NavItem } from './NavItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/documents', label: 'Document Library', icon: <FileText size={16} /> },
  { href: '/profile', label: 'Profile', icon: <User size={16} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={16} /> },
];

export function TopNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
            <Button variant="ghost" size="sm" className="hidden md:flex" aria-label="User menu">
              <User size={18} />
              <span className="ml-2 text-sm font-medium">Account</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hidden hover:text-red-500 md:flex"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOut size={18} />
              <span className="ml-2 text-sm font-medium">Sign Out</span>
            </Button>

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
          </nav>
        </div>
      </div>
    </header>
  );
}
