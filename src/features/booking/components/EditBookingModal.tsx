// src/features/booking/components/EditBookingModal.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookingPayload, TableItem, TableStatusClass } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { formatVND, isValidVietnamesePhone, formatTime24To12 } from '../../../utils/formatters';
import { FloorBlueprint, CustomTableBadge } from '../../floorplan/components/FloorBlueprint';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Users,
  DollarSign,
  FileText,
  Save,
  AlertCircle,
  AlertTriangle,
  Map,
  List,
  Layers,
} from 'lucide-react';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: BookingPayload | null;
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  onClose: () => void;
  onSave: (updatedBooking: BookingPayload) => Promise<void>;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  booking,
  tables,
  statusMap,
  onClose,
  onSave,
}) => {
  const [tenKhach, setTenKhach] = useState('');
  const [sdt, setSdt] = useState('');
  const [ngayDat, setNgayDat] = useState('');
  const [gioDat, setGioDat] = useState('');
  const [soKhach, setSoKhach] = useState<number>(2);
  const [tienCoc, setTienCoc] = useState<number>(0);
  const [ghiChu, setGhiChu] = useState('');
  const [nguoiNhap, setNguoiNhap] = useState('');
  const [trangThai, setTrangThai] = useState<'CHỜ XÁC NHẬN' | 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'HỦY'>('CHỜ XÁC NHẬN');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [viewTableMode, setViewTableMode] = useState<'blueprint' | 'list'>('blueprint');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when booking changes
  React.useEffect(() => {
    if (booking) {
      setTenKhach(booking.ten_khach || '');
      setSdt(booking.sdt || '');
      setNgayDat(booking.ngay_dat || '');
      setGioDat(booking.gio_dat || '18:00');
      setSoKhach(booking.so_khach || 2);
      setTienCoc(booking.tien_coc || 0);
      setGhiChu(booking.ghi_chu || '');
      setNguoiNhap(booking.nguoi_nhap || 'Chủ SMO');
      setTrangThai(booking.trang_thai || 'CHỜ XÁC NHẬN');
      setSelectedTables(new Set(booking.danh_sach_ban || []));
      setErrors({});
    }
  }, [booking, isOpen]);

  if (!isOpen || !booking) return null;

  const originalTables = booking.danh_sach_ban || [];

  // Toggle table in edit mode
  const handleToggleTable = (tableId: string) => {
    const curStatus = statusMap[tableId] || 'empty';
    const isCurrentlyInThisBooking = originalTables.includes(tableId);

    // If table is occupied by someone else, prevent selection
    if (curStatus !== 'empty' && !isCurrentlyInThisBooking && !selectedTables.has(tableId)) {
      setErrors({
        ...errors,
        tables: `Bàn ${tableId} đang có khách (${STATUS_COLORS[curStatus]?.label || curStatus}). Chỉ có thể chọn bàn Trống màu Vàng.`,
      });
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.tables;
      return next;
    });

    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!tenKhach.trim()) {
      errs.ten_khach = 'Vui lòng nhập họ tên khách hàng (*)';
    }
    if (!sdt.trim()) {
      errs.sdt = 'Vui lòng nhập số điện thoại (*)';
    } else if (!isValidVietnamesePhone(sdt)) {
      errs.sdt = 'Số điện thoại không đúng định dạng (10 số)';
    }
    if (!ngayDat) {
      errs.ngay_dat = 'Vui lòng chọn ngày đặt';
    }
    if (!gioDat) {
      errs.gio_dat = 'Vui lòng chọn giờ đặt';
    }
    if (soKhach < 1) {
      errs.so_khach = 'Số khách tối thiểu là 1 người';
    }
    if (selectedTables.size === 0 && trangThai !== 'HỦY') {
      errs.tables = 'Vui lòng chọn ít nhất 1 bàn cho đơn đặt';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const updated: BookingPayload = {
        ...booking,
        ten_khach: tenKhach.trim(),
        sdt: sdt.trim(),
        ngay_dat: ngayDat,
        gio_dat: gioDat,
        so_khach: Number(soKhach),
        tien_coc: Number(tienCoc),
        ghi_chu: ghiChu.trim(),
        nguoi_nhap: nguoiNhap.trim() || 'Chủ SMO',
        trang_thai: trangThai,
        danh_sach_ban: Array.from(selectedTables),
      };

      await onSave(updated);
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin đơn:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom table badges for FloorBlueprint
  const customBadges: Record<string, CustomTableBadge> = {};
  selectedTables.forEach((tId) => {
    const isNew = !originalTables.includes(tId);
    customBadges[tId] = {
      label: isNew ? 'MỚI' : 'CHỌN',
      bg: isNew ? '#22c55e' : '#facc15',
      text: isNew ? '#ffffff' : '#020617',
    };
  });

  const isTableDisabled = (tableId: string, currentStatus: TableStatusClass) => {
    const isCurrentlyInThisBooking = originalTables.includes(tableId);
    if (selectedTables.has(tableId)) return false;
    if (isCurrentlyInThisBooking) return false;
    return currentStatus !== 'empty';
  };

  return (
    <AnimatePresence>
      <div
        id="edit-booking-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="edit-booking-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                ✏️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">SỬA THÔNG TIN ĐẶT BÀN & KHÁCH HÀNG</h3>
                <p className="text-xs text-amber-400 font-medium">
                  Mã đơn: <strong className="font-mono">{booking.id_dat}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-edit-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Tên khách & SĐT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Họ tên khách hàng <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="edit-input-ten-khach"
                  value={tenKhach}
                  onChange={(e) => {
                    setTenKhach(e.target.value);
                    if (errors.ten_khach) setErrors({ ...errors, ten_khach: '' });
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.ten_khach ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                  }`}
                />
                {errors.ten_khach && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.ten_khach}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Số điện thoại <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  id="edit-input-sdt"
                  value={sdt}
                  onChange={(e) => {
                    setSdt(e.target.value);
                    if (errors.sdt) setErrors({ ...errors, sdt: '' });
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.sdt ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                  }`}
                />
                {errors.sdt && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.sdt}
                  </p>
                )}
              </div>
            </div>

            {/* Ngày đặt & Giờ đặt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Ngày đặt (YYYY-MM-DD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  id="edit-input-ngay-dat"
                  value={ngayDat}
                  onChange={(e) => setNgayDat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Giờ đặt (24h & AM/PM) <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {gioDat} ({formatTime24To12(gioDat)})
                  </span>
                </label>
                <input
                  type="time"
                  id="edit-input-gio-dat"
                  value={gioDat}
                  onChange={(e) => setGioDat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                {/* Quick Shift Selection Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['11:30', '12:00', '12:30', '17:30', '18:00', '18:30', '19:00', '19:30'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setGioDat(time)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        gioDat === time
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {time} ({time.startsWith('11') || time.startsWith('12') ? 'Trưa' : 'Tối'})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Số lượng khách, Tiền cọc & Trạng thái */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Số lượng khách <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSoKhach(Math.max(1, soKhach - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="edit-input-so-khach"
                    min="1"
                    value={soKhach}
                    onChange={(e) => setSoKhach(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 text-center py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setSoKhach(soKhach + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Tiền cọc (VNĐ)
                  </span>
                  <span className="text-amber-400 font-bold text-xs">{formatVND(tienCoc)}</span>
                </label>
                <input
                  type="number"
                  id="edit-input-tien-coc"
                  step="50000"
                  min="0"
                  value={tienCoc}
                  onChange={(e) => setTienCoc(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Trạng thái đơn đặt
                </label>
                <select
                  value={trangThai}
                  onChange={(e) =>
                    setTrangThai(e.target.value as 'CHỜ XÁC NHẬN' | 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'HỦY')
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CHỜ XÁC NHẬN">⏳ CHỜ XÁC NHẬN (Cam)</option>
                  <option value="ĐÃ XÁC NHẬN">🔴 ĐÃ XÁC NHẬN (Đỏ)</option>
                  <option value="ĐÃ ĐẾN">🟢 ĐÃ ĐẾN (Xanh lá)</option>
                  <option value="HỦY">❌ HỦY ĐƠN</option>
                </select>
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Ghi chú yêu cầu của khách
              </label>
              <textarea
                rows={2}
                id="edit-input-ghi-chu"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Yêu cầu vị trí, sinh nhật, xuất hóa đơn..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* SELECTION OF TABLES - BÀN GÁN CHO ĐƠN */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🪑</span>
                    Đổi thông tin Bàn gán cho đơn ({selectedTables.size} bàn):
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {Array.from<string>(selectedTables).map((tId) => (
                      <span
                        key={tId}
                        className={`px-2 py-0.5 rounded text-[11px] font-black shadow flex items-center gap-1 ${
                          originalTables.includes(tId)
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        Bàn {tId}
                        <button
                          type="button"
                          onClick={() => handleToggleTable(tId)}
                          className="hover:text-red-900 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewTableMode('blueprint')}
                    className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold ${
                      viewTableMode === 'blueprint'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Map className="w-3 h-3" /> Sơ đồ bàn
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTableMode('list')}
                    className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold ${
                      viewTableMode === 'list'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3 h-3" /> Danh sách
                  </button>
                </div>
              </div>

              {errors.tables && (
                <div className="p-2 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errors.tables}</span>
                </div>
              )}

              {viewTableMode === 'blueprint' ? (
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 max-h-[45vh] overflow-y-auto flex flex-col items-center">
                  <FloorBlueprint
                    tables={tables}
                    statusMap={statusMap}
                    selectedTables={selectedTables}
                    onToggleTable={handleToggleTable}
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
                      const isSelected = selectedTables.has(t.id);
                      const isOriginal = originalTables.includes(t.id);
                      const isEmpty = st === 'empty';

                      let btnClass = 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed';
                      if (isSelected) {
                        btnClass = isOriginal
                          ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400 shadow-md scale-105'
                          : 'bg-emerald-600 text-white font-black ring-2 ring-emerald-400 shadow-md scale-105';
                      } else if (isEmpty) {
                        btnClass =
                          'bg-[#fdd835]/90 hover:bg-[#fdd835] text-slate-950 font-bold border border-amber-600 hover:scale-105';
                      }

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleToggleTable(t.id)}
                          disabled={!isEmpty && !isSelected}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center justify-center transition-all ${btnClass}`}
                        >
                          <span className="font-bold">{t.name.replace('Bàn ', '')}</span>
                          <span className="text-[9px] opacity-75">
                            {isSelected ? (isOriginal ? 'Đang gán' : 'Thêm mới') : isEmpty ? 'Trống' : 'Bận'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer Action Buttons */}
          <div className="px-5 py-3.5 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              id="btn-cancel-edit-booking"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 text-xs"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              id="btn-submit-edit-booking"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
