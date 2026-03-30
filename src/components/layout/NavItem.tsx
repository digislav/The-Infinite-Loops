'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export function NavItem({ href, label, icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      )}
    >
      {icon && <span aria-hidden={true}>{icon}</span>}
      {label}
    </Link>
  );
}
