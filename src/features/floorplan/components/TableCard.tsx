// src/features/floorplan/components/TableCard.tsx
import React from 'react';
import { STATUS_COLORS } from '../../../config/constants';
import { TableItem, TableStatusClass, ActionMode } from '../../../types';
import { Lock, Check } from 'lucide-react';

interface TableCardProps {
  table: TableItem;
  status: TableStatusClass;
  isSelected: boolean;
  actionMode?: ActionMode;
  bookingCustomerName?: string;
  isSearchMatched?: boolean;
  onToggleSelect: (tableId: string) => void;
  customClass?: string;
  disabled?: boolean;
  customBadge?: { label: string; bg: string; text: string };
}

export const TableCard: React.FC<TableCardProps> = React.memo(({
  table,
  status,
  isSelected,
  actionMode,
  bookingCustomerName,
  isSearchMatched = false,
  onToggleSelect,
  customClass = '',
  disabled,
  customBadge,
}) => {
  const colorDef = STATUS_COLORS[status] || STATUS_COLORS.empty;

  // Determine if this table is selectable in the current action mode
  const isSelectableInMode = React.useMemo(() => {
    if (disabled !== undefined) return !disabled;
    if (!actionMode) return true;
    if (actionMode === 'BOOK') {
      return status === 'empty';
    }
    if (actionMode === 'CANCEL') {
      return status === 'booked' || status === 'confirmed' || status === 'arrived';
    }
    if (actionMode === 'CONFIRM') {
      return status === 'booked' || status === 'confirmed';
    }
    if (actionMode === 'ARRIVE') {
      return status === 'booked' || status === 'confirmed' || status === 'arrived';
    }
    if (actionMode === 'LEAVE') {
      // Điều kiện: Bàn đang có trạng thái ĐÃ ĐẾN mới sử dụng chức năng ĐÃ VỀ được
      return status === 'arrived';
    }
    if (actionMode === 'LOCK') {
      return status === 'empty' || status === 'inactive';
    }
    return true;
  }, [actionMode, status, disabled]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelectableInMode) return;
    onToggleSelect(table.id);
  };

  // Is VIP room on 1st floor (70, 72, 74, 76)
  const isVipRoom = table.id.startsWith('VIP7');

  return (
    <button
      type="button"
      id={`table-card-${table.id}`}
      onClick={handleClick}
      disabled={!isSelectableInMode}
      title={`Bàn ${table.name} (${table.capacity || 4} chỗ) - Trạng thái: ${colorDef.label}${status !== 'empty' && status !== 'inactive' && bookingCustomerName ? ` - Khách: ${bookingCustomerName}` : ''}${customBadge ? ` [${customBadge.label}]` : ''}`}
      style={{
        backgroundColor: customBadge?.bg || colorDef.bg,
        color: customBadge?.text || colorDef.text,
        borderColor: isSelected ? '#d32f2f' : isSearchMatched ? '#f59e0b' : '#222222',
      }}
      className={`relative flex flex-col items-center justify-center border border-black shadow-[0_1px_2px_rgba(0,0,0,0.2)] select-none transition-all duration-150 ${
        isVipRoom ? 'w-full h-12 py-1' : 'w-full h-9 sm:h-10'
      } ${
        isSelected
          ? 'table-selected-blink ring-2 ring-red-600 z-20 scale-105 font-black'
          : isSearchMatched
          ? 'ring-2 ring-amber-400 z-10 scale-105 shadow-amber-500/50 animate-pulse'
          : 'hover:opacity-90 active:scale-95'
      } ${!isSelectableInMode ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'} ${customClass}`}
    >
      {/* Custom badge (e.g. NGUỒN, ĐÍCH, HIỆN TẠI) */}
      {customBadge && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded text-[8px] font-black uppercase shadow tracking-wider z-20 whitespace-nowrap"
          style={{ backgroundColor: customBadge.bg, color: customBadge.text, border: '1px solid black' }}
        >
          {customBadge.label}
        </span>
      )}

      {/* Selected Indicator Badge */}
      {isSelected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow border border-white text-[9px] font-black z-30">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}

      {/* Search match badge */}
      {isSearchMatched && !isSelected && (
        <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow text-[8px] font-black z-20">
          ★
        </span>
      )}

      {/* Lock Icon */}
      {status === 'inactive' && !customBadge && (
        <span className="absolute top-0.5 right-0.5 opacity-80">
          <Lock className="w-2.5 h-2.5 text-zinc-300" />
        </span>
      )}

      {/* Table Number */}
      <span className="text-xs sm:text-sm font-black tracking-tight leading-none text-center">
        {table.name}
      </span>

      {/* Capacity for VIP Rooms (10kh) */}
      {isVipRoom && (
        <span className="text-[10px] font-semibold opacity-90 leading-tight mt-0.5">
          10kh
        </span>
      )}

      {/* Booking Customer preview ONLY when table is occupied (not empty and not locked) */}
      {status !== 'empty' && status !== 'inactive' && bookingCustomerName && !isVipRoom && !customBadge && (
        <span className="text-[8px] font-bold px-0.5 truncate max-w-full leading-tight text-center">
          {bookingCustomerName}
        </span>
      )}
    </button>
  );
});

TableCard.displayName = 'TableCard';

