import { TopNav } from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-background min-h-screen print:bg-white print:min-h-0">
      <div className="print:hidden">
        <TopNav />
      </div>
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8 print:max-w-none print:p-0 print:m-0">{children}</main>
    </div>
  );
}
