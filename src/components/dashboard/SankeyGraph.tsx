'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sankey, Tooltip, ResponsiveContainer, Layer } from 'recharts';
import type { Job, PipelineStage } from '@/types/job.types';
import type { JobFilters } from './BoardControls';

const STAGE_COLORS: Record<string, string> = {
  Total: '#94a3b8', // slate-400
  Interested: '#4f46e5', // indigo-600
  Applied: '#2563eb', // blue-600
  Interview: '#d97706', // amber-600
  Offer: '#059669', // emerald-600
  Rejected: '#dc2626', // red-600
  Ghosted: '#cbd5e1', // slate-300
  Archived: '#6b7280', // gray-500
};

interface SankeyGraphProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  filters: JobFilters;
}

export function SankeyGraph({ jobs, loading, error, filters }: SankeyGraphProps) {
  const data = useMemo(() => {
    // 1. Filter jobs by Location, Priority, Deadline (ignore Stage filter to show full flow)
    const filteredJobs = jobs.filter((job) => {
      if (filters.location !== 'all' && job.location !== filters.location) return false;
      if (filters.priority === 'priority' && !job.priorityFlag) return false;
      return true;
    });

    if (filteredJobs.length === 0) return null;

    // 2. Aggregate links using Waterfall Assumption
    const linksMap = new Map<string, number>();
    function addLink(source: string, target: string) {
      const key = `${source}|${target}`;
      linksMap.set(key, (linksMap.get(key) || 0) + 1);
    }

    filteredJobs.forEach((job) => {
      const s = job.pipelineStage;
      if (s === 'Interested') {
        addLink('Total', 'Interested');
      } else if (s === 'Applied') {
        addLink('Total', 'Applied');
      } else if (s === 'Interview') {
        addLink('Total', 'Applied');
        addLink('Applied', 'Interview');
      } else if (s === 'Offer') {
        addLink('Total', 'Applied');
        addLink('Applied', 'Interview');
        addLink('Interview', 'Offer');
      } else if (s === 'Rejected') {
        addLink('Total', 'Applied');
        addLink('Applied', 'Rejected');
      } else if (s === 'Ghosted') {
        // Ghosted generally happens after an interview (or applied), 
        // let's route it from Interview for visual balance
        addLink('Total', 'Applied');
        addLink('Applied', 'Interview');
        addLink('Interview', 'Ghosted');
      } else if (s === 'Archived') {
        addLink('Total', 'Interested');
        addLink('Interested', 'Archived');
      }
    });

    // 3. Build Node array and Map
    const nodeNames = Array.from(
      new Set(Array.from(linksMap.keys()).flatMap((k) => k.split('|')))
    );
    
    const nodes = nodeNames.map((name) => ({ 
        name,
        fill: STAGE_COLORS[name] || '#ccc'
    }));

    // 4. Build Links array properly mapped to Node Indices
    const links = Array.from(linksMap.entries()).map(([key, value]) => {
      const [sourceName, targetName] = key.split('|');
      return {
        source: nodeNames.indexOf(sourceName),
        target: nodeNames.indexOf(targetName),
        value,
      };
    });

    return { nodes, links };
  }, [jobs, filters]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex h-[500px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2E75B6] border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex h-[500px] items-center justify-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.links.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex h-[500px] flex-col items-center justify-center gap-2">
          <p className="text-lg font-semibold text-gray-900">No flow data available</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or adding jobs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-gray-900">Pipeline Flow Diagram</CardTitle>
        <CardDescription>
          Visualize the drop-off and conversion rates of your current applications based on your active filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              nodePadding={50}
              margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
              node={(props: any) => {
                const { x, y, width, height, index, payload } = props;
                return (
                  <Layer key={`CustomNode${index}`}>
                    <rect x={x} y={y} width={width} height={height} fill={payload.fill} fillOpacity="1" rx="2" />
                    <text
                      x={x + width + 8}
                      y={y + height / 2}
                      dy={-4}
                      fontSize="13"
                      fill="#111827"
                      fontWeight="600"
                      textAnchor="start"
                    >
                      {payload.name}
                    </text>
                    <text
                      x={x + width + 8}
                      y={y + height / 2}
                      dy={14}
                      fontSize="12"
                      fill="#6b7280"
                      textAnchor="start"
                    >
                      {payload.value} jobs
                    </text>
                  </Layer>
                );
              }}
              link={(props: any) => {
                const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
                const targetName = payload?.target?.name || props?.target?.name || '';
                const isNegative = targetName === 'Rejected' || targetName === 'Archived' || targetName === 'Ghosted';
                const color = isNegative ? 'rgba(220, 38, 38, 0.35)' : 'rgba(16, 185, 129, 0.4)';
                
                return (
                  <path
                    d={`
                      M${sourceX},${sourceY}
                      C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
                    `}
                    fill="none"
                    stroke={color}
                    strokeWidth={Math.max(linkWidth, 1)}
                  />
                );
              }}
            >
              <Tooltip
                content={({ payload }) => {
                  if (payload && payload.length) {
                    const data = payload[0].payload;
                    if (data.source && data.target) {
                        return (
                            <div className="rounded-lg border bg-white p-3 shadow-lg">
                                <p className="text-sm font-semibold text-gray-700 font-mono">
                                    {data.source.name} &rarr; {data.target.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Volume: {data.value} jobs</p>
                            </div>
                        );
                    }
                    return (
                        <div className="rounded-lg border bg-white p-3 shadow-lg">
                            <p className="text-sm font-bold text-gray-900">{data.name}</p>
                            <p className="text-xs text-gray-500 mt-1">Total Volume: {data.value} jobs</p>
                        </div>
                    );
                  }
                  return null;
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
