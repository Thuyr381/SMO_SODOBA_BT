// src/features/floorplan/components/LinkTableModal.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, AlertTriangle, Check, X, Users, Utensils, Map, List } from 'lucide-react';
import { BookingPayload, TableItem, TableStatusClass } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { FloorBlueprint, CustomTableBadge } from './FloorBlueprint';

interface LinkTableModalProps {
  isOpen: boolean;
  booking: BookingPayload | null;
  currentTableId: string;
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  onClose: () => void;
  onConfirmLink: (idDat: string, addedTables: string[]) => Promise<void>;
}

export const LinkTableModal: React.FC<LinkTableModalProps> = ({
  isOpen,
  booking,
  currentTableId,
  tables,
  statusMap,
  onClose,
  onConfirmLink,
}) => {
  const [selectedAddTables, setSelectedAddTables] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'blueprint' | 'list'>('blueprint');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedAddTables(new Set());
    setErrorMessage(null);
  }, [isOpen, currentTableId]);

  if (!isOpen || !booking) return null;

  const existingTables = booking.danh_sach_ban || [currentTableId];

  const toggleAddTable = (tblId: string) => {
    if (existingTables.includes(tblId)) {
      setErrorMessage(`Bàn ${tblId} đã thuộc đơn này rồi!`);
      return;
    }

    const curStatus = statusMap[tblId] || 'empty';
    if (curStatus !== 'empty' && !selectedAddTables.has(tblId)) {
      setErrorMessage(`Bàn ${tblId} đang có khách (${STATUS_COLORS[curStatus]?.label || curStatus})! Bàn nối thêm phải ở trạng thái Trống màu Vàng.`);
      return;
    }

    setErrorMessage(null);
    setSelectedAddTables((prev) => {
      const next = new Set(prev);
      if (next.has(tblId)) {
        next.delete(tblId);
      } else {
        next.add(tblId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedAddTables.size === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 bàn trống để nối thêm!');
      return;
    }

    const added: string[] = Array.from(selectedAddTables);
    for (const t of added) {
      const st: TableStatusClass = statusMap[t] || 'empty';
      if (st !== 'empty') {
        setErrorMessage(`Bàn ${t} không còn ở trạng thái Trống. Vui lòng chọn lại.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirmLink(booking.id_dat || '', added);
      onClose();
    } catch (err) {
      console.error('Lỗi khi nối thêm bàn:', err);
      setErrorMessage('Có lỗi xảy ra trong quá trình nối bàn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build custom badges and disabled logic for S8 Blueprint
  const customBadges: Record<string, CustomTableBadge> = {};
  existingTables.forEach((tId) => {
    customBadges[tId] = {
      label: 'HIỆN TẠI',
      bg: '#0284c7',
      text: '#ffffff',
    };
  });
  selectedAddTables.forEach((tId) => {
    customBadges[tId] = {
      label: 'NỐI THÊM',
      bg: '#facc15',
      text: '#020617',
    };
  });

  const isTableDisabled = (tableId: string, currentStatus: TableStatusClass) => {
    if (existingTables.includes(tableId)) return true;
    if (selectedAddTables.has(tableId)) return false;
    return currentStatus !== 'empty';
  };

  return (
    <AnimatePresence>
      <div
        id="link-table-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="link-table-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                🔗
              </div>
              <div>
                <h3 className="text-base font-bold text-white">GỘP / NỐI THÊM BÀN (TABLE LINKING)</h3>
                <p className="text-xs text-slate-300">
                  Khách: <strong className="text-amber-400">{booking.ten_khach}</strong> ({booking.sdt}) • Mã: {booking.id_dat}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-link-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Current Table vs Added Table Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-900/60 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                  Bàn hiện tại của đơn ({existingTables.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {existingTables.map((tId) => (
                    <span
                      key={tId}
                      className="px-2.5 py-1 rounded-md bg-sky-600 text-white font-black text-xs shadow"
                    >
                      Bàn {tId}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  * Giữ nguyên thông tin đơn và thực đơn hiện tại.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Bàn chọn nối thêm ({selectedAddTables.size}):
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1 min-h-6">
                  {selectedAddTables.size > 0 ? (
                    Array.from<string>(selectedAddTables).map((tId) => (
                      <span
                        key={tId}
                        className="px-2.5 py-1 rounded-md bg-[#fdd835] text-slate-950 font-black text-xs shadow flex items-center gap-1"
                      >
                        Bàn {tId}
                        <button
                          type="button"
                          onClick={() => toggleAddTable(tId)}
                          className="hover:text-red-600 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-slate-400">Chạm vào bàn trống trên sơ đồ bên dưới...</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  * Các bàn được nối sẽ chuyển sang trạng thái của đơn ({booking.trang_thai}).
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Table Selection Mode */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Chọn bàn trống để nối thêm:
                </label>
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('blueprint')}
                    className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold ${
                      viewMode === 'blueprint' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Map className="w-3 h-3" /> Sơ đồ bàn
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold ${
                      viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3 h-3" /> Danh sách
                  </button>
                </div>
              </div>

              {viewMode === 'blueprint' ? (
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 max-h-[50vh] overflow-y-auto flex flex-col items-center">
                  <FloorBlueprint
                    tables={tables}
                    statusMap={statusMap}
                    selectedTables={selectedAddTables}
                    onToggleTable={toggleAddTable}
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
                      const isExisting = existingTables.includes(t.id);
                      const isSelected = selectedAddTables.has(t.id);
                      const isEmpty = st === 'empty';

                      let btnClass = 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed';
                      if (isExisting) {
                        btnClass = 'bg-sky-900/80 text-sky-200 border border-sky-700 opacity-80';
                      } else if (isSelected) {
                        btnClass = 'bg-[#fdd835] text-slate-950 font-black border-2 border-black ring-2 ring-amber-400 shadow-md scale-105';
                      } else if (isEmpty) {
                        btnClass = 'bg-[#fdd835]/90 hover:bg-[#fdd835] text-slate-950 font-bold border border-amber-600 hover:scale-105';
                      }

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleAddTable(t.id)}
                          disabled={!isEmpty && !isSelected}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center justify-center transition-all ${btnClass}`}
                        >
                          <span className="font-bold">{t.name.replace('Bàn ', '')}</span>
                          <span className="text-[9px] opacity-75">
                            {isExisting ? 'Đang dùng' : isSelected ? 'Đã chọn' : isEmpty ? 'Trống' : 'Bận'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="px-5 py-3.5 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              id="btn-cancel-link"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 text-xs"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              id="btn-confirm-link"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedAddTables.size === 0}
              className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                selectedAddTables.size > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Link2 className="w-4 h-4" />
              {isSubmitting
                ? 'Đang kết nối...'
                : `XÁC NHẬN NỐI THÊM (${selectedAddTables.size} BÀN)`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
