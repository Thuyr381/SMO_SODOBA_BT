// src/features/floorplan/components/HeaderBar.tsx
import React from 'react';
import { STATUS_COLORS } from '../../../config/constants';
import { TableItem, TableStatusClass } from '../../../types';
import { RefreshCw, Database, UtensilsCrossed, LayoutGrid, Calendar } from 'lucide-react';

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
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 flex flex-col gap-2">
        {/* Top utility row: App Tabs & Refresh */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          {/* Logo / Badge */}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-xs">
              S8 TÂN PHÚ
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Telegram Mini App
            </span>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              id="nav-tab-floorplan"
              onClick={() => onChangeView('floorplan')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                currentView === 'floorplan'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Sơ đồ bàn
            </button>

            <button
              type="button"
              id="nav-tab-bookings"
              onClick={() => onChangeView('bookings')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all relative ${
                currentView === 'bookings'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Đơn & Món
              {bookingCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.1 text-[10px] rounded-full bg-rose-600 text-white font-bold">
                  {bookingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              id="nav-tab-settings"
              onClick={() => onChangeView('settings')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                currentView === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Cấu hình Google Sheets / GAS"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sheet / GAS</span>
            </button>

            <button
              type="button"
              id="btn-manual-refresh"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              title="Đồng bộ ngay"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Blueprint Title Box (Exact red title from SMO) */}
        <div className="w-full max-w-[460px] sm:max-w-[490px] mx-auto bg-slate-850/80 p-2 rounded-xl border border-slate-700/80 shadow flex flex-col items-center gap-1.5">
          <h1 id="app-title" className="text-base sm:text-lg font-black tracking-wide text-[#e53935] uppercase text-center drop-shadow-sm">
            SƠ ĐỒ MẶT BẰNG TÂN PHÚ (S8)
          </h1>

          {/* 5 Status Legends */}
          <div id="status-legend-bar" className="flex items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
            {/* 1. Trống */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.empty.bg }} />
              <span className="text-slate-200 text-[11px] sm:text-xs">Trống ({counts.empty})</span>
            </div>

            {/* 2. Đã đặt */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.booked.bg }} />
              <span className="text-slate-200 text-[11px] sm:text-xs">Đã đặt ({counts.booked})</span>
            </div>

            {/* 3. Xác nhận */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.confirmed.bg }} />
              <span className="text-slate-200 text-[11px] sm:text-xs">Xác nhận ({counts.confirmed})</span>
            </div>

            {/* 4. Đã đến */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.arrived.bg }} />
              <span className="text-slate-200 text-[11px] sm:text-xs">Đã đến ({counts.arrived})</span>
            </div>

            {/* 5. Khóa */}
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-[2px] border border-black inline-block" style={{ backgroundColor: STATUS_COLORS.inactive.bg }} />
              <span className="text-slate-200 text-[11px] sm:text-xs">Khóa ({counts.inactive})</span>
            </div>
          </div>

          {/* Date Picker Row: 🗓️ XEM NGÀY: [ 31/08/2026 📅 ] */}
          <div className="flex items-center justify-center gap-2 mt-0.5 text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1 text-slate-100 uppercase tracking-tight">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              XEM NGÀY:
            </span>
            <input
              type="date"
              id="date-filter-input"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="px-2.5 py-1 rounded bg-white text-black font-mono font-bold text-xs border border-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

