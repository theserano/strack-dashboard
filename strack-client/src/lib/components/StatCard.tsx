import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Percent vs the previous period; null/undefined hides the trend. */
  change?: number | null;
  hint?: string;
  loading?: boolean;
};

const StatCard = ({ label, value, icon: Icon, change, hint, loading }: Props) => (
  <div className="border border-[#E1E4EA] rounded-xl p-5 flex flex-col gap-3 bg-white">
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#525866]">{label}</span>
      <div className="w-9 h-9 rounded-lg bg-[#F7F9FC] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#525866]" />
      </div>
    </div>
    {loading ? (
      <div className="h-8 w-32 rounded bg-[#F1F3F6] animate-pulse" aria-label="Loading" />
    ) : (
      <p className="text-2xl font-semibold text-[#0E121B]">{value}</p>
    )}
    <div className="flex items-center gap-1 h-4">
      {!loading && change != null && (
        <>
          {change >= 0 ? (
            <TrendingUp className="w-3 h-3 text-[#036B26]" />
          ) : (
            <TrendingDown className="w-3 h-3 text-[#9E0A05]" />
          )}
          <span className={`text-xs ${change >= 0 ? 'text-[#036B26]' : 'text-[#9E0A05]'}`}>
            {change > 0 ? '+' : ''}
            {change}%
          </span>
          <span className="text-xs text-[#525866]">vs previous period</span>
        </>
      )}
      {!loading && change == null && hint && <span className="text-xs text-[#525866]">{hint}</span>}
    </div>
  </div>
);

export default StatCard;
