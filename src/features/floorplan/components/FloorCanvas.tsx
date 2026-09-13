// src/features/floorplan/components/FloorCanvas.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TableItem, TableStatusClass, ActionMode, BookingPayload } from '../../../types';
import { FloorBlueprint } from './FloorBlueprint';
import { SearchBar } from './SearchBar';
import { normalizeTableId, normalizeDateString, parseTableList, mapTrangThaiToTableStatus } from '../../../utils/tableHelper';
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

export const FloorCanvas: React.FC<FloorCanvasProps> = React.memo(({
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
  const [naturalHeight, setNaturalHeight] = useState(620);
  const containerRef = useRef<HTMLDivElement>(null);
  const blueprintMeasureRef = useRef<HTMLDivElement>(null);

  // Natural blueprint dimensions
  // Chiều cao chuẩn bao gồm cả VIP 70..76 và VIP 2 lầu 2B là ~610-630px
  const NATURAL_WIDTH = 444;

  // Đo đạc kích thước thực tế của Blueprint qua ResizeObserver
  useEffect(() => {
    if (!blueprintMeasureRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measured = Math.round(entry.contentRect.height) || blueprintMeasureRef.current?.offsetHeight;
        if (measured && measured > 450 && Math.abs(measured - naturalHeight) > 4) {
          setNaturalHeight(measured);
        }
      }
    });
    observer.observe(blueprintMeasureRef.current);
    return () => observer.disconnect();
  }, [naturalHeight]);

  // Calculate dynamic scale factor to fit floorplan into 1 single frame/viewport without scrolling
  useEffect(() => {
    const calculateScale = () => {
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;

      // Measure existing top bars dynamically if rendered
      const headerEl = document.getElementById('header-bar');
      const actionEl = document.getElementById('action-toolbar');
      const searchEl = document.getElementById('search-bar-container');
      const zoomEl = document.getElementById('canvas-zoom-bar');

      const topOccupied =
        (headerEl?.offsetHeight || 84) +
        (actionEl?.offsetHeight || 38) +
        (searchEl?.offsetHeight || 34) +
        (zoomEl?.offsetHeight || 26);

      // Safe bottom space (đảm bảo không bị che khuất thanh dưới)
      const bottomSafe = 24;

      // Available width (with minimal margin)
      const availW = Math.max(windowW - 16, 280);
      // Available height strictly within current viewport
      const availH = Math.max(windowH - topOccupied - bottomSafe, 240);

      const naturalH = naturalHeight || 620;
      const scaleByW = availW / NATURAL_WIDTH;
      const scaleByH = availH / naturalH;

      // Trên PC và Tablet: cho phép phóng to hơn để nhìn rõ nét (lên tới 1.45x)
      const maxFit = windowW >= 1024 ? 1.45 : (windowW >= 768 ? 1.3 : 1.15);

      // Fit mode ensures BOTH width and height fit on the screen without scrolling
      const calculated = Math.min(scaleByW, scaleByH);
      const rounded = Math.max(0.45, Math.min(Number(calculated.toFixed(2)), maxFit));
      setFitScale(rounded);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [naturalHeight]);

  const currentScale = isFitMode ? fitScale : manualScale;

  // Zoom helpers
  const handleZoomIn = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 1.6));
  };

  const handleZoomOut = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 0.45));
  };

  const handleReset100 = () => {
    setIsFitMode(false);
    setManualScale(1);
  };

  const handleToggleFit = () => {
    setIsFitMode((prev) => !prev);
  };

  // Map of normalized table ID to customer name across all aliases
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
      const customerName = (b.ten_khach || '').trim();
      if (!customerName) return;

      tableList.forEach((rawTId) => {
        const normId = normalizeTableId(rawTId);
        if (!normId) return;

        // Gán tên khách hàng cho tất cả các định dạng alias của bàn
        map[normId] = customerName;
        map[rawTId] = customerName;

        if (/^\d+$/.test(normId)) {
          const num = parseInt(normId, 10);
          map[String(num)] = customerName;
          map[`B${String(num)}`] = customerName;
          map[`B${('0' + num).slice(-2)}`] = customerName;
          if ([70, 72, 74, 76].includes(num)) {
            map[`VIP${num}`] = customerName;
          }
        } else if (normId.startsWith('VIP7')) {
          const num = normId.replace('VIP', '');
          map[num] = customerName;
          map[`B${num}`] = customerName;
          map[normId] = customerName;
        } else if (normId === 'VIP1' || normId === '2A') {
          map['VIP1'] = customerName;
          map['2A'] = customerName;
          map['LẦU 2A'] = customerName;
        } else if (normId === 'VIP2' || normId === '2B') {
          map['VIP2'] = customerName;
          map['2B'] = customerName;
          map['LẦU 2B'] = customerName;
        }
      });
    });
    return map;
  }, [bookings, selectedDate]);

  // Effective status map: Kết hợp statusMap hiện tại và các đơn đặt bàn tích cực cho ngày đã chọn
  const effectiveStatusMap = React.useMemo(() => {
    const nextMap = { ...statusMap };
    const normSelectedDate = selectedDate ? normalizeDateString(selectedDate) : '';

    bookings.forEach((b) => {
      if (b.trang_thai === 'HỦY') return;

      if (normSelectedDate && b.ngay_dat) {
        const bookingDate = normalizeDateString(b.ngay_dat);
        if (bookingDate && bookingDate !== normSelectedDate) {
          return;
        }
      }

      const tableList = parseTableList(b.danh_sach_ban);
      const bStatus = mapTrangThaiToTableStatus(b.trang_thai);

      tableList.forEach((rawTId) => {
        const normId = normalizeTableId(rawTId);
        if (!normId) return;

        // Nếu statusMap chưa kịp có dữ liệu hoặc đang là empty, lấy ngay status từ đơn đặt
        if (!nextMap[normId] || nextMap[normId] === 'empty') {
          nextMap[normId] = bStatus;
        }
        if (!nextMap[rawTId] || nextMap[rawTId] === 'empty') {
          nextMap[rawTId] = bStatus;
        }
      });
    });

    return nextMap;
  }, [statusMap, bookings, selectedDate]);

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

  return (
    <div id="floorplan-canvas-wrapper" className="w-full flex flex-col items-center py-0">
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
      <div id="canvas-zoom-bar" className="w-full max-w-[500px] flex items-center justify-between px-2 py-0.5 mb-0.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-300">Sơ đồ S8</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono font-bold">
            {Math.round(currentScale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Fit to screen toggle button */}
          <button
            type="button"
            id="btn-toggle-fit-screen"
            onClick={handleToggleFit}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              isFitMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Tự động thu phóng để Sơ đồ nằm gọn trong 1 khung hình (không cần cuộn trang)"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            <span>{isFitMode ? 'Vừa khung hình' : 'Tự do'}</span>
          </button>

          {/* Zoom Out [-] */}
          <button
            type="button"
            id="btn-zoom-out"
            onClick={handleZoomOut}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Thu nhỏ sơ đồ"
          >
            <ZoomOut className="w-2.5 h-2.5" />
          </button>

          {/* Reset 100% */}
          <button
            type="button"
            id="btn-zoom-reset"
            onClick={handleReset100}
            className="px-1 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-[9px] font-mono transition-colors"
            title="Về kích thước chuẩn 100%"
          >
            <RotateCcw className="w-2 h-2 mr-0.5" />
            100%
          </button>

          {/* Zoom In [+] */}
          <button
            type="button"
            id="btn-zoom-in"
            onClick={handleZoomIn}
            className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
            title="Phóng to sơ đồ"
          >
            <ZoomIn className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Blueprint Viewport Container: Auto-scales cleanly to fit in 1 screen frame */}
      <div
        ref={containerRef}
        id="blueprint-viewport-wrapper"
        className="w-full flex justify-center items-start overflow-x-auto overflow-y-visible select-none px-1 py-1"
        style={{
          minHeight: isFitMode ? `${Math.round(naturalHeight * currentScale) + 16}px` : 'auto',
          maxWidth: '100%',
        }}
      >
        <div
          id="blueprint-scalable-element"
          style={{
            transform: `scale(${currentScale})`,
            transformOrigin: 'top center',
            width: `${NATURAL_WIDTH}px`,
            marginBottom: isFitMode ? `-${Math.max(0, Math.round(naturalHeight * (1 - currentScale)))}px` : 0,
          }}
          className="transition-transform duration-200 ease-out shrink-0"
        >
          <div ref={blueprintMeasureRef} className="w-full">
            <FloorBlueprint
              tables={tables}
              statusMap={effectiveStatusMap}
              selectedTables={selectedTables}
              onToggleTable={onToggleTable}
              actionMode={actionMode}
              customerMap={customerMap}
              matchingTableIds={matchingTableIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

FloorCanvas.displayName = 'FloorCanvas';
