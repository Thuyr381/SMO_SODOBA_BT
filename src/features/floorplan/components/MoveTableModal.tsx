// src/features/floorplan/components/MoveTableModal.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookingPayload, TableItem, TableStatusClass } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { FloorBlueprint, CustomTableBadge } from './FloorBlueprint';
import { X, ArrowRightLeft, CheckCircle2, AlertTriangle, Printer, Map, List } from 'lucide-react';

interface MoveTableModalProps {
  isOpen: boolean;
  booking: BookingPayload;
  sourceTableId: string;
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  onClose: () => void;
  onConfirmMove: (payload: {
    booking: BookingPayload;
    oldTables: string[];
    newTables: string[];
    printTicket: boolean;
  }) => Promise<void>;
}

export const MoveTableModal: React.FC<MoveTableModalProps> = ({
  isOpen,
  booking,
  sourceTableId,
  tables,
  statusMap,
  onClose,
  onConfirmMove,
}) => {
  // Use all tables currently associated with this booking
  const actualSourceTables = React.useMemo(() => {
    if (booking.danh_sach_ban && booking.danh_sach_ban.length > 0) {
      return booking.danh_sach_ban;
    }
    return [sourceTableId];
  }, [booking, sourceTableId]);

  // Selected target tables for move
  const [selectedTargetTables, setSelectedTargetTables] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'blueprint' | 'list'>('blueprint');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const toggleTargetTable = (tableId: string) => {
    // Cannot select source tables as target
    if (actualSourceTables.includes(tableId)) {
      setErrorMessage(`Bàn ${tableId} là bàn nguồn cũ đang dời đi.`);
      return;
    }

    const currentStatus = statusMap[tableId] || 'empty';
    if (currentStatus !== 'empty' && !selectedTargetTables.has(tableId)) {
      setErrorMessage(`Bàn ${tableId} không ở trạng thái Trống (${STATUS_COLORS[currentStatus]?.label || currentStatus}). Vui lòng chọn bàn Trống màu Vàng.`);
      return;
    }

    setErrorMessage('');
    setSelectedTargetTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetTables.size === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 bàn đích mới.');
      return;
    }

    // Verify again that none of the target tables are occupied
    const targets: string[] = Array.from(selectedTargetTables);
    for (const t of targets) {
      const st: TableStatusClass = statusMap[t] || 'empty';
      if (st !== 'empty' && !actualSourceTables.includes(t)) {
        setErrorMessage(`Bàn ${t} không còn ở trạng thái Trống. Vui lòng chọn lại.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirmMove({
        booking,
        oldTables: actualSourceTables,
        newTables: targets,
        printTicket: true,
      });
      onClose();
    } catch (err) {
      console.error('Lỗi khi thực hiện dời bàn:', err);
      setErrorMessage('Có lỗi xảy ra trong quá trình dời bàn. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build custom badges and disabled logic for S8 Blueprint
  const customBadges: Record<string, CustomTableBadge> = {};
  actualSourceTables.forEach((tId) => {
    customBadges[tId] = {
      label: 'NGUỒN',
      bg: '#e11d48',
      text: '#ffffff',
    };
  });
  selectedTargetTables.forEach((tId) => {
    customBadges[tId] = {
      label: 'ĐÍCH',
      bg: '#facc15',
      text: '#020617',
    };
  });

  const isTableDisabled = (tableId: string, currentStatus: TableStatusClass) => {
    if (actualSourceTables.includes(tableId)) return true;
    if (selectedTargetTables.has(tableId)) return false;
    return currentStatus !== 'empty';
  };

  const availableEmptyTables = tables.filter((t) => {
    const st = statusMap[t.id] || t.status || 'empty';
    return st === 'empty' && !actualSourceTables.includes(t.id);
  });

  return (
    <AnimatePresence>
      <div
        id="move-table-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden"
      >
        <motion.div
          id="move-table-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] sm:h-auto sm:max-h-[92dvh] max-w-2xl bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 flex items-start justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3.5 bg-slate-800 border-b border-slate-700">
            <div className="min-w-0 flex flex-1 items-start gap-2">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                🔄
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base leading-tight font-bold text-white">
                  ĐỔI TOÀN BỘ NHÓM BÀN <span className="whitespace-nowrap">(GROUP TRANSFER)</span>
                </h3>
                <p className="mt-1 text-[11px] sm:text-xs leading-snug text-slate-300 break-words">
                  Khách: <strong className="text-amber-400">{booking.ten_khach}</strong>
                  <span className="whitespace-nowrap"> ({booking.sdt})</span>
                  <span className="hidden sm:inline"> • </span>
                  <span className="block sm:inline">Mã: {booking.id_dat}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-move-modal"
              onClick={onClose}
              aria-label="Đóng cửa sổ đổi bàn"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div
            id="move-table-modal-body"
            className="min-h-0 flex-1 p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 overflow-y-auto overscroll-contain"
          >
            {/* Step 1 & 2 Comparison Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vị trí cũ (Nhóm bàn nguồn) */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  1. Vị trí nhóm bàn cũ (Tự động nhận diện):
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {actualSourceTables.map((tId) => (
                    <span
                      key={tId}
                      className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-black text-xs shadow"
                    >
                      Bàn {tId}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  * Trạng thái {actualSourceTables.length} bàn này sẽ được giải phóng về <strong>TRỐNG</strong>.
                </span>
              </div>

              {/* Vị trí mới (Nhóm bàn đích) */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  2. Nhóm bàn đích đã chọn ({selectedTargetTables.size}):
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1 min-h-6">
                  {selectedTargetTables.size > 0 ? (
                    Array.from<string>(selectedTargetTables).map((tId) => (
                      <span
                        key={tId}
                        className="px-2.5 py-1 rounded-md bg-[#fdd835] text-slate-950 font-black text-xs shadow flex items-center gap-1"
                      >
                        Bàn {tId}
                        <button
                          type="button"
                          onClick={() => toggleTargetTable(tId)}
                          className="hover:text-red-600 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-semibold text-amber-100">
                      Chạm vào một bàn màu vàng bên dưới để chọn bàn đích.
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  * Số lượng bàn mới có thể khác số lượng bàn cũ.
                </span>
              </div>
            </div>

            {/* Error notice */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Table Picker Section */}
            <div className="flex flex-col gap-2">
              <div id="move-table-picker-header" className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div id="move-table-picker-label" className="min-w-0">
                  <label className="block text-[11px] sm:text-xs font-bold leading-snug text-slate-200 uppercase tracking-wide sm:tracking-wider">
                    Chọn bàn đích mới
                  </label>
                  <span className="block mt-0.5 text-[10px] leading-snug text-slate-400">
                    Chỉ chọn bàn màu vàng — còn {availableEmptyTables.length} bàn trống.
                  </span>
                </div>
                <div
                  id="move-table-view-toggle"
                  className="grid w-full grid-cols-2 items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs sm:flex sm:w-auto shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('blueprint')}
                    className={`min-w-0 justify-center px-2 py-1.5 sm:py-1 rounded flex items-center gap-1 text-[11px] font-bold whitespace-nowrap ${
                      viewMode === 'blueprint' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Map className="w-3 h-3" /> Sơ đồ bàn
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`min-w-0 justify-center px-2 py-1.5 sm:py-1 rounded flex items-center gap-1 text-[11px] font-bold whitespace-nowrap ${
                      viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3 h-3" /> Danh sách
                  </button>
                </div>
              </div>

              {viewMode === 'blueprint' ? (
                <div
                  id="move-table-blueprint-picker"
                  className="p-1.5 sm:p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center [touch-action:pan-y]"
                >
                  <FloorBlueprint
                    tables={tables}
                    statusMap={statusMap}
                    selectedTables={selectedTargetTables}
                    onToggleTable={toggleTargetTable}
                    isTableDisabled={isTableDisabled}
                    customBadges={customBadges}
                    compact
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {tables.map((t) => {
                      const st = statusMap[t.id] || t.status || 'empty';
                      const isSource = actualSourceTables.includes(t.id);
                      const isTargetSelected = selectedTargetTables.has(t.id);
                      const isEmpty = st === 'empty';

                      let btnClass = 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed';
                      if (isSource) {
                        btnClass = 'bg-rose-900/80 text-rose-200 border border-rose-700 opacity-80';
                      } else if (isTargetSelected) {
                        btnClass = 'bg-[#fdd835] text-slate-950 font-black border-2 border-black ring-2 ring-amber-400 shadow-md scale-105';
                      } else if (isEmpty) {
                        btnClass = 'bg-[#fdd835]/90 hover:bg-[#fdd835] text-slate-950 font-bold border border-amber-600 hover:scale-105';
                      }

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTargetTable(t.id)}
                          disabled={!isEmpty && !isTargetSelected}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center justify-center transition-all ${btnClass}`}
                        >
                          <span className="font-bold">{t.name.replace('Bàn ', '')}</span>
                          <span className="text-[9px] opacity-75">
                            {isSource ? 'Nguồn' : isTargetSelected ? 'Đã chọn' : isEmpty ? 'Trống' : 'Bận'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Note about kitchen print ticket */}
            <div className="p-2.5 sm:p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
              <Printer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Tự động xuất Phiếu Báo Bếp/Bar:</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Hệ thống sẽ ghi nhận lịch sử điều chuyển từ [Bàn {actualSourceTables.join(', ')}] sang [Bàn{' '}
                  {Array.from(selectedTargetTables).join(', ') || '...'}], chuyển tiếp toàn bộ thực đơn đã đặt và hiển thị phiếu in bàn giao cho phục vụ.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div
            id="move-table-modal-footer"
            className="shrink-0 px-3 py-2.5 sm:px-5 sm:py-3.5 bg-slate-800/95 border-t border-slate-700 flex items-center justify-end gap-2 sm:gap-3"
            style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              id="btn-cancel-move"
              onClick={onClose}
              disabled={isSubmitting}
              className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 text-xs"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              id="btn-confirm-move"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTargetTables.size === 0}
              className={`min-w-0 flex-1 sm:flex-none justify-center px-3 sm:px-5 py-2.5 sm:py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 shadow-lg transition-all ${
                selectedTargetTables.size > 0
                  ? 'bg-orange-500 hover:bg-orange-400 text-slate-950 active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              {isSubmitting ? (
                'Đang xử lý...'
              ) : (
                <>
                  <span className="sm:hidden truncate">ĐỔI SANG [{Array.from(selectedTargetTables).join(', ')}]</span>
                  <span className="hidden sm:inline">XÁC NHẬN ĐỔI SANG [{Array.from(selectedTargetTables).join(', ')}]</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
