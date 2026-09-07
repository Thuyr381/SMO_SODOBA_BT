// src/features/floorplan/components/SearchBar.tsx
import React, { useState } from 'react';
import { Search, X, User, Phone, TableProperties, Sparkles } from 'lucide-react';
import { BookingPayload, TableItem } from '../../../types';
import { normalizeTableId, parseTableList } from '../../../utils/tableHelper';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchingTableIds: Set<string>;
  bookings: BookingPayload[];
  tables: TableItem[];
  onSelectBooking: (booking: BookingPayload) => void;
  onSelectTable: (tableId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  matchingTableIds,
  bookings,
  tables,
  onSelectBooking,
  onSelectTable,
}) => {
  const [isOpenResults, setIsOpenResults] = useState(false);

  // Find matching bookings
  const matchedBookings = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return bookings.filter((b) => {
      if (b.trang_thai === 'HỦY') return false;
      const matchName = b.ten_khach?.toLowerCase().includes(q);
      const matchPhone = b.sdt?.includes(q) || (b.sdt && b.sdt.slice(-3) === q);
      const matchId = b.id_dat?.toLowerCase().includes(q);
      const parsedTables = parseTableList(b.danh_sach_ban);
      const matchTables = parsedTables.some(
        (t) => t.toLowerCase().includes(q) || `b${t}`.includes(q) || `bàn ${t}`.includes(q)
      );
      return matchName || matchPhone || matchId || matchTables;
    });
  }, [searchQuery, bookings]);

  // Find matching tables
  const matchedTablesList = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return tables.filter((t) => {
      const normId = normalizeTableId(t.id).toLowerCase();
      const nameLower = t.name.toLowerCase();
      return (
        normId.includes(q) ||
        nameLower.includes(q) ||
        `b${normId}`.includes(q) ||
        `bàn ${normId}`.includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, tables]);

  return (
    <div id="search-bar-container" className="w-full max-w-[500px] mx-auto relative mb-1 px-1">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          id="input-search-table-customer"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpenResults(Boolean(e.target.value.trim()));
          }}
          onFocus={() => {
            if (searchQuery.trim()) setIsOpenResults(true);
          }}
          placeholder="🔍 Tìm bàn: Tên khách / 3 số đuôi SĐT / Số bàn..."
          className="w-full pl-8 pr-7 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            id="btn-clear-search"
            onClick={() => {
              onSearchChange('');
              setIsOpenResults(false);
            }}
            className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Matching summary chip badge */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between mt-0.5 px-1 text-[10px] text-amber-400 font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            Tìm thấy <strong>{matchingTableIds.size} bàn</strong> phù hợp
          </span>
          {matchingTableIds.size > 0 && (
            <span className="text-slate-300 font-mono text-[9px]">
              [{Array.from(matchingTableIds).join(', ')}]
            </span>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown List */}
      {isOpenResults && (matchedBookings.length > 0 || matchedTablesList.length > 0) && (
        <div
          id="search-results-dropdown"
          className="absolute left-1 right-1 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto p-1.5 flex flex-col gap-1"
        >
          {matchedBookings.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5">
                Đơn đặt bàn khớp ({matchedBookings.length})
              </div>
              {matchedBookings.map((b) => (
                <button
                  key={b.id_dat}
                  type="button"
                  onClick={() => {
                    onSelectBooking(b);
                    setIsOpenResults(false);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-400" />
                      {b.ten_khach}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {b.sdt} • {b.gio_dat} ({b.so_khach} khách)
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[11px]">
                      Bàn: {b.danh_sach_ban.join(', ')}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{b.id_dat}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedTablesList.length > 0 && (
            <div className="mt-1 border-t border-slate-800 pt-1">
              <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-0.5">
                Bàn trên sơ đồ ({matchedTablesList.length})
              </div>
              <div className="flex flex-wrap gap-1 px-1">
                {matchedTablesList.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTable(t.id);
                      setIsOpenResults(false);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <TableProperties className="w-3 h-3" />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
