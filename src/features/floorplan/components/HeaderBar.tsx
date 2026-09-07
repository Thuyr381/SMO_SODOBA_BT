// src/features/floorplan/components/HeaderBar.tsx
import React from 'react';
import { STATUS_COLORS } from '../../../config/constants';
import { TableItem, TableStatusClass } from '../../../types';
import { RefreshCw, Database, UtensilsCrossed, LayoutGrid, Calendar, Lock } from 'lucide-react';

interface HeaderBarProps {
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  isLoading: boolean;
  onRefresh: () => void;
  currentView: 'floorplan' | 'bookings' | 'settings';
  onChangeView: (view: 'floorplan' | 'bookings' | 'settings') => void;
  bookingCount: number;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  isGasUnlocked?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  tables,
  statusMap,
  isLoading,
  onRefresh,
  currentView,
  onChangeView,
  bookingCount,
  selectedDate,
  onChangeDate,
  isGasUnlocked = false,
}) => {
  // Calculate status counts
  const counts = React.useMemo(() => {
    const stats: Record<TableStatusClass, number> = {
      empty: 0,
      booked: 0,
      confirmed: 0,
      arrived: 0,
      inactive: 0,
    };

    tables.forEach((tbl) => {
      const st = statusMap[tbl.id] || tbl.status || 'empty';
      stats[st] = (stats[st] || 0) + 1;
    });

    return stats;
  }, [tables, statusMap]);

  return (
    <header id="header-bar" className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-1 sm:py-1.5 flex flex-col gap-1 sm:gap-1.5">
        {/* Top utility row: App Tabs & Refresh */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 gap-1">
          {/* Logo / Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[11px] sm:text-xs whitespace-nowrap shrink-0">
              S8 TÂN PHÚ
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden sm:inline">
              Telegram Mini App
            </span>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              id="nav-tab-floorplan"
              onClick={() => onChangeView('floorplan')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                currentView === 'floorplan'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Sơ đồ</span>
            </button>

            <button
              type="button"
              id="nav-tab-bookings"
              onClick={() => onChangeView('bookings')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-all relative ${
                currentView === 'bookings'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Đơn/Món</span>
              {bookingCount > 0 && (
                <span className="ml-0.5 px-1 py-0.1 text-[9px] rounded-full bg-rose-600 text-white font-bold whitespace-nowrap shrink-0">
                  {bookingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              id="nav-tab-settings"
              onClick={() => onChangeView('settings')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                currentView === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={isGasUnlocked ? 'Cấu hình Google Sheets / GAS' : 'Cấu hình Google Sheets / GAS (Yêu cầu mật khẩu)'}
            >
              {isGasUnlocked ? (
                <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              ) : (
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="text-[10px] sm:text-[11px] whitespace-nowrap">Sheet/GAS</span>
            </button>

            <button
              type="button"
              id="btn-manual-refresh"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-50 shrink-0"
              title="Đồng bộ ngay"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Blueprint Title & Status Bar (Streamlined for zero vertical overflow) */}
        {currentView === 'floorplan' && (
          <div className="w-full max-w-[500px] mx-auto bg-slate-850/80 px-2 py-1 rounded-lg border border-slate-700/80 shadow flex flex-col gap-1">
            {/* Header sub-row: Title & Date Picker inline */}
            <div className="flex items-center justify-between gap-1">
              <h1 id="app-title" className="text-xs sm:text-sm font-black tracking-wide text-[#e53935] uppercase truncate drop-shadow-sm">
                SƠ ĐỒ MẶT BẰNG S8
              </h1>
              {/* Inline compact date picker */}
              <div className="flex items-center gap-1 shrink-0">
                <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                <input
                  type="date"
                  id="date-filter-input"
                  value={selectedDate}
                  onChange={(e) => onChangeDate(e.target.value)}
                  className="px-1.5 py-0.5 rounded bg-white text-black font-mono font-bold text-[10px] sm:text-[11px] border border-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* 5 Status Legends */}
            <div id="status-legend-bar" className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold border-t border-slate-750 pt-0.5">
              {/* 1. Trống */}
              <div className="flex items-center gap-0.5">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.empty.bg }} />
                <span className="text-slate-200">Trống ({counts.empty})</span>
              </div>

              {/* 2. Đã đặt */}
              <div className="flex items-center gap-0.5">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.booked.bg }} />
                <span className="text-slate-200">Đặt ({counts.booked})</span>
              </div>

              {/* 3. Xác nhận */}
              <div className="flex items-center gap-0.5">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.confirmed.bg }} />
                <span className="text-slate-200">Xác nhận ({counts.confirmed})</span>
              </div>

              {/* 4. Đã đến */}
              <div className="flex items-center gap-0.5">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.arrived.bg }} />
                <span className="text-slate-200">Đến ({counts.arrived})</span>
              </div>

              {/* 5. Khóa */}
              <div className="flex items-center gap-0.5">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.inactive.bg }} />
                <span className="text-slate-200">Khóa ({counts.inactive})</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

