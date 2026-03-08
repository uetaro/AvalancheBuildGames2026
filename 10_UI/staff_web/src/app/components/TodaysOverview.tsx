import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import pointIcon from 'figma:asset/coin.png';
import kudosIcon from 'figma:asset/kudos.png';

interface TodaysOverviewProps {
  role: 'staff' | 'manager';
}

export default function TodaysOverview({ role }: TodaysOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const summaryData = {
    activeStays: 127,
    kudosToday: 43,
    pendingCheckouts: 8,
    alerts: 3,
  };

  return (
    <div className="border-t border-[#E5E7EB] bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F7F8FA] transition-colors"
      >
        <span className="text-sm font-medium text-[#081A33]">Today's Overview</span>
        {isExpanded ? (
          <ChevronUp size={16} className="text-[#6B7280]" />
        ) : (
          <ChevronDown size={16} className="text-[#6B7280]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#F7F8FA] rounded-lg p-2.5">
              <p className="text-xs text-[#6B7280] mb-1">Active Stays</p>
              <p className="text-lg font-semibold text-[#081A33]">{summaryData.activeStays}</p>
            </div>
            <div className="bg-[#FF6B6B]/5 rounded-lg p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <img src={kudosIcon} alt="Kudos" className="w-3 h-3" />
                <p className="text-xs text-[#6B7280]">Kudos</p>
              </div>
              <p className="text-lg font-semibold text-[#081A33]">{summaryData.kudosToday}</p>
            </div>
            <div className="bg-[#C9A227]/5 rounded-lg p-2.5">
              <p className="text-xs text-[#6B7280] mb-1">Pending</p>
              <p className="text-lg font-semibold text-[#081A33]">{summaryData.pendingCheckouts}</p>
            </div>
            <div className="bg-[#FF6B6B]/5 rounded-lg p-2.5">
              <p className="text-xs text-[#6B7280] mb-1">Alerts</p>
              <p className="text-lg font-semibold text-[#FF6B6B]">{summaryData.alerts}</p>
            </div>
          </div>

          {/* Quick Alerts */}
          {summaryData.alerts > 0 && (
            <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg p-2.5">
              <p className="text-xs font-medium text-[#EF4444] mb-1">Attention Required</p>
              <p className="text-xs text-[#6B7280]">
                {summaryData.alerts} items need your attention
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}