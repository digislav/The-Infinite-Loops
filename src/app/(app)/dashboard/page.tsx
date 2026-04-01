import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { BoardControls } from '@/components/dashboard/BoardControls';
import { BoardContent } from '@/components/dashboard/BoardContent';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      <StatsBar />
      <BoardControls />
      <BoardContent />
    </div>
  );
}
