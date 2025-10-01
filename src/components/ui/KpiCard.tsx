// src/components/ui/KpiCard.tsx
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SBCard } from './ui-primitives';

const KpiCard = ({
  icon: Icon,
  title,
  value,
  change,
  progress,
  goal,
  goalNumber,
  leaderValue,
  leaderName,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  change?: string;
  progress?: number;
  goal?: string;
  goalNumber?: number;
  leaderValue?: number;
  leaderName?: string;
  color?: string;
}) => {
  const isUp = change?.startsWith("+");
  const numericValue = useMemo(() => {
    const n = parseFloat((value || "0").toString().replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [value]);
  const denom = useMemo(() => {
    if (goalNumber && goalNumber > 0) return goalNumber;
    return Math.max(numericValue, leaderValue ?? 0, 1);
  }, [goalNumber, numericValue, leaderValue]);
  const myPct = Math.min(100, (progress ?? (numericValue / denom) * 100));
  const leaderPct = Math.min(100, ((leaderValue ?? 0) / denom) * 100);
  const isLeader = leaderValue !== undefined && numericValue >= (leaderValue ?? 0);
  const missing = Math.max(0, Math.ceil((leaderValue ?? 0) - numericValue));

  return (
    <SBCard>
      <div className="p-5">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-white p-2 rounded-lg border">
            <Icon className="text-gray-500" size={20} />
          </div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
        </div>

        <p className="text-3xl font-bold text-text-primary">{value}</p>

        {change && (
          <div className="flex items-center text-sm mt-1">
            {isUp ? (
              <TrendingUp className="text-green-600 mr-1" size={16} />
            ) : (
              <TrendingDown className="text-red-600 mr-1" size={16} />
            )}
            <span className={`${isUp ? "text-green-600" : "text-red-600"} font-semibold mr-1`}>{change}</span>
            <span className="text-gray-500">vs mes anterior</span>
          </div>
        )}

        {(goal || leaderValue !== undefined) && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{goal ? goal : `${numericValue} / ${denom}`}</span>
            </div>

            <div className="relative w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              {leaderValue !== undefined && (
                <div aria-hidden className="absolute left-0 top-0 h-1.5 rounded-full" style={{ width: `${leaderPct}%`, backgroundColor: `${color}33` }} />
              )}
              <div className="relative h-1.5 rounded-full" style={{ width: `${myPct}%`, backgroundColor: color }} />
            </div>

            {leaderValue !== undefined && (
              <div className="mt-1 text-[11px] text-gray-500">
                {isLeader ? 'Eres líder 🔝' : <>Líder: <b>{leaderName ?? '—'}</b> con <b>{leaderValue}</b>{missing > 0 ? <> — te faltan <b>{missing}</b></> : null}</>}
              </div>
            )}
          </div>
        )}
      </div>
    </SBCard>
  );
};

export default KpiCard;
