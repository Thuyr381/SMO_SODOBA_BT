// src/features/floorplan/components/FloorCanvas.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TableItem, TableStatusClass, ActionMode, BookingPayload } from '../../../types';
import { FloorBlueprint } from './FloorBlueprint';
import { SearchBar } from './SearchBar';
import { normalizeTableId, normalizeDateString, parseTableList } from '../../../utils/tableHelper';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface FloorCanvasProps {
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  selectedTables: Set<string>;
  actionMode: ActionMode;
  bookings: BookingPayload[];
  onToggleTable: (tableId: string) => void;
  onInspectBooking?: (booking: BookingPayload) => void;
  selectedDate?: string;
  onChangeDate?: (date: string) => void;
}

export const FloorCanvas: React.FC<FloorCanvasProps> = ({
  tables,
  statusMap,
  selectedTables,
  actionMode,
  bookings,
  onToggleTable,
  onInspectBooking,
  selectedDate,
}) => {
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Zoom & Fit-to-screen state
  const [isFitMode, setIsFitMode] = useState(true);
  const [manualScale, setManualScale] = useState(1);
  const [fitScale, setFitScale] = useState(0.85);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic scale factor to fit floorplan into 1 single frame/viewport
  useEffect(() => {
    const calculateScale = () => {
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;

      // Natural blueprint dimensions
      const naturalW = 450;
      const naturalH = 590;

      // Available width (padding 12px)
      const availW = Math.min(windowW - 16, 480);
      // Available height minus top header, action toolbar, search bar, zoom controls, and bottom bar
      // On mobile / Telegram Mini App, header+nav+search+bottom ~180px
      const availH = Math.max(windowH - 185, 340);

      const scaleByW = availW / naturalW;
      const scaleByH = availH / naturalH;

      // Fit mode ensures BOTH width and height fit on the screen without scrolling
      const calculated = Math.min(scaleByW, scaleByH, 1.05);
      const rounded = Math.max(0.52, Math.min(Number(calculated.toFixed(2)), 1.1));
      setFitScale(rounded);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const currentScale = isFitMode ? fitScale : manualScale;

  // Zoom helpers
  const handleZoomIn = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 1.4));
  };

  const handleZoomOut = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 0.5));
  };

  const handleReset100 = () => {
    setIsFitMode(false);
    setManualScale(1);
  };

  const handleToggleFit = () => {
    setIsFitMode((prev) => !prev);
  };

  // Map of normalized table ID to customer name
  const customerMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    const normSelectedDate = selectedDate ? normalizeDateString(selectedDate) : '';

    bookings.forEach((b) => {
      // Bỏ qua đơn HỦY và đơn NO-SHOW (Khóa bàn)
      if (b.trang_thai === 'HỦY' || b.trang_thai === 'NO-SHOW') return;

      // Lọc theo ngày chọn nếu có
      if (normSelectedDate && b.ngay_dat) {
        const bookingDate = normalizeDateString(b.ngay_dat);
        if (bookingDate && bookingDate !== normSelectedDate) {
          return;
        }
      }

      const tableList = parseTableList(b.danh_sach_ban);
      tableList.forEach((rawTId) => {
        const normId = normalizeTableId(rawTId);
        // Chỉ gán tên nếu bàn đó không ở trạng thái trống hoặc khóa
        const currentStatus = statusMap[normId] || statusMap[rawTId];
        if (currentStatus !== 'empty' && currentStatus !== 'inactive') {
          map[normId] = b.ten_khach;
        }
      });
    });
    return map;
  }, [bookings, selectedDate, statusMap]);

  // Set of table IDs that match the search query (Tên khách, 3 số đuôi SĐT, số bàn)
  const matchingTableIds = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();

    const matched = new Set<string>();

    // 1. Check bookings for customer name or phone (full or last 3 digits) or id_dat
    bookings.forEach((b) => {
      if (b.trang_thai === 'HỦY') return;
      const matchName = b.ten_khach?.toLowerCase().includes(q);
      const matchPhone = b.sdt?.includes(q) || (b.sdt && b.sdt.slice(-3) === q);
      const matchId = b.id_dat?.toLowerCase().includes(q);
      if (matchName || matchPhone || matchId) {
        const parsedTables = parseTableList(b.danh_sach_ban);
        parsedTables.forEach((tId) => {
          matched.add(normalizeTableId(tId));
        });
      }
    });

    // 2. Check table ids / names
    tables.forEach((t) => {
      const normId = normalizeTableId(t.id).toLowerCase();
      const normName = t.name.toLowerCase();
      if (normId.includes(q) || normName.includes(q) || t.id.toLowerCase().includes(q)) {
        matched.add(t.id);
      }
    });

    return matched;
  }, [searchQuery, bookings, tables]);

  // Blueprint natural height constant for transform offset compensation
  const NATURAL_HEIGHT = 590;
  const NATURAL_WIDTH = 450;

  return (
    <div id="floorplan-canvas-wrapper" className="w-full flex flex-col items-center py-0.5">
      {/* Search Input Box */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchingTableIds={matchingTableIds}
        bookings={bookings}
        tables={tables}
        onSelectBooking={(b) => {
          if (onInspectBooking) onInspectBooking(b);
          else if (b.danh_sach_ban && b.danh_sach_ban[0]) onToggleTable(b.danh_sach_ban[0]);
        }}
        onSelectTable={(tId) => onToggleTable(tId)}
      />

      {/* Responsive Viewport & Zoom Toolbar */}
      <div className="w-full max-w-lg flex items-center justify-between px-2 py-1 mb-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px] font-medium text-slate-300">Sơ đồ S8</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono font-bold">
            {Math.round(currentScale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Fit to screen toggle button */}
          <button
            type="button"
            id="btn-toggle-fit-screen"
            onClick={handleToggleFit}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
              isFitMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Tự động thu phóng để Sơ đồ nằm gọn trong 1 khung hình (không cần cuộn trang)"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isFitMode ? 'Vừa khung hình' : 'Tự do'}</span>
          </button>

          {/* Zoom Out [-] */}
          <button
            type="button"
            id="btn-zoom-out"
            onClick={handleZoomOut}
            className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Thu nhỏ sơ đồ"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          {/* Reset 100% */}
          <button
            type="button"
            id="btn-zoom-reset"
            onClick={handleReset100}
            className="px-1.5 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-[10px] font-mono transition-colors"
            title="Về kích thước chuẩn 100%"
          >
            <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
            100%
          </button>

          {/* Zoom In [+] */}
          <button
            type="button"
            id="btn-zoom-in"
            onClick={handleZoomIn}
            className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Phóng to sơ đồ"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Blueprint Viewport Container: Auto-scales cleanly to fit in 1 screen frame */}
      <div
        ref={containerRef}
        id="blueprint-viewport-wrapper"
        className="w-full flex justify-center items-start overflow-hidden select-none"
        style={{
          height: isFitMode ? `${Math.round(NATURAL_HEIGHT * currentScale)}px` : 'auto',
          maxWidth: '100%',
        }}
      >
        <div
          id="blueprint-scalable-element"
          style={{
            transform: `scale(${currentScale})`,
            transformOrigin: 'top center',
            width: `${NATURAL_WIDTH}px`,
            marginBottom: isFitMode ? `-${Math.round(NATURAL_HEIGHT * (1 - currentScale))}px` : 0,
          }}
          className="transition-transform duration-200 ease-out shrink-0"
        >
          <FloorBlueprint
            tables={tables}
            statusMap={statusMap}
            selectedTables={selectedTables}
            onToggleTable={onToggleTable}
            actionMode={actionMode}
            customerMap={customerMap}
            matchingTableIds={matchingTableIds}
          />
        </div>
      </div>
    </div>
  );
};

