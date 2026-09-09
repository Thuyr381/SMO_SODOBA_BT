// src/features/booking/components/EditBookingModal.tsx
import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookingPayload, TableItem, TableStatusClass } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { formatVND, isValidVietnamesePhone, formatTime24To12 } from '../../../utils/formatters';
import {
  normalizeDateString,
  areDatesMatching,
  normalizeTableId,
} from '../../../utils/tableHelper';
import { FloorBlueprint, CustomTableBadge } from '../../floorplan/components/FloorBlueprint';
import { BlueprintScaler } from '../../floorplan/components/BlueprintScaler';
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
  CheckCircle2,
  Map as MapIcon,
  List,
  Layers,
} from 'lucide-react';

interface EditBookingModalProps {
  isOpen: boolean;
  booking: BookingPayload | null;
  tables: TableItem[];
  statusMap: Record<string, TableStatusClass>;
  bookings?: BookingPayload[];
  onClose: () => void;
  onSave: (updatedBooking: BookingPayload) => Promise<void>;
}

function formatDateDisplay(rawDate: string | undefined | null): string {
  if (!rawDate) return '';
  const norm = normalizeDateString(rawDate);
  const parts = norm.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return rawDate;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  booking,
  tables,
  statusMap,
  bookings = [],
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
      setNgayDat(normalizeDateString(booking.ngay_dat) || '');
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

  // Helper dates computation
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const newDateNormalized = normalizeDateString(ngayDat);
  const isDateChanged = Boolean(booking && ngayDat && !areDatesMatching(ngayDat, booking.ngay_dat));

  // Conflict Checking: find all other active bookings on target date
  const otherActiveBookingsOnTargetDate = useMemo(() => {
    if (!booking || !ngayDat) return [];
    return bookings.filter((b) => {
      if (b.id_dat === booking.id_dat) return false;
      if (b.trang_thai === 'HỦY') return false;
      return areDatesMatching(b.ngay_dat, ngayDat);
    });
  }, [bookings, booking, ngayDat]);

  // Map of occupied tables on target date -> booking
  const occupiedTablesOnTargetDateMap = useMemo(() => {
    const map = new Map<string, BookingPayload>();
    otherActiveBookingsOnTargetDate.forEach((b) => {
      (b.danh_sach_ban || []).forEach((tId) => {
        const norm = normalizeTableId(tId);
        if (norm) map.set(norm, b);
      });
    });
    return map;
  }, [otherActiveBookingsOnTargetDate]);

  // Conflicted tables among currently selected
  const conflictedSelectedTables = useMemo(() => {
    const list: { tableId: string; booking: BookingPayload }[] = [];
    selectedTables.forEach((tId) => {
      const norm = normalizeTableId(tId);
      if (occupiedTablesOnTargetDateMap.has(norm)) {
        list.push({ tableId: tId, booking: occupiedTablesOnTargetDateMap.get(norm)! });
      }
    });
    return list;
  }, [selectedTables, occupiedTablesOnTargetDateMap]);

  if (!isOpen || !booking) return null;

  const originalTables = booking.danh_sach_ban || [];

  // Quick future date jump helper
  const handleQuickAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setNgayDat(`${y}-${m}-${day}`);
    if (errors.ngay_dat) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.ngay_dat;
        return next;
      });
    }
  };

  // Toggle table in edit mode
  const handleToggleTable = (tableId: string) => {
    const normId = normalizeTableId(tableId);

    // If table is occupied on target date by another booking
    if (occupiedTablesOnTargetDateMap.has(normId)) {
      const ob = occupiedTablesOnTargetDateMap.get(normId)!;
      setErrors({
        ...errors,
        tables: `Bàn ${tableId} đã có khách đặt trước vào ngày ${formatDateDisplay(ngayDat)} (${ob.ten_khach} - ${ob.sdt} lúc ${ob.gio_dat}). Không thể chọn bàn này!`,
      });
      return;
    }

    // If on current date and occupied by another booking
    if (!isDateChanged) {
      const curStatus = statusMap[tableId] || 'empty';
      const isCurrentlyInThisBooking = originalTables.includes(tableId);
      if (curStatus !== 'empty' && !isCurrentlyInThisBooking && !selectedTables.has(tableId)) {
        setErrors({
          ...errors,
          tables: `Bàn ${tableId} đang có khách (${STATUS_COLORS[curStatus]?.label || curStatus}). Chỉ có thể chọn bàn Trống màu Vàng.`,
        });
        return;
      }
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
      errs.ngay_dat = 'Vui lòng chọn ngày đặt (*)';
    } else if (isDateChanged && newDateNormalized < tomorrowStr) {
      // Yêu cầu logic: Chỉ có thể đổi ngày thành ngày của tương lai (>= ngày mai)
      errs.ngay_dat = `Khi dời ngày đặt bàn, chỉ được chọn ngày trong tương lai (từ ngày mai ${formatDateDisplay(tomorrowStr)} trở đi). Không thể dời về hôm nay hoặc quá khứ.`;
    }

    if (!gioDat) {
      errs.gio_dat = 'Vui lòng chọn giờ đặt (*)';
    }
    if (soKhach < 1) {
      errs.so_khach = 'Số khách tối thiểu là 1 người';
    }
    if (selectedTables.size === 0 && trangThai !== 'HỦY') {
      errs.tables = 'Vui lòng chọn ít nhất 1 bàn cho đơn đặt';
    }

    // Yêu cầu logic: Phải kiểm tra xem ngày đó đã có Bàn nào đặt trước chưa để tránh bị đặt Trùng
    if (conflictedSelectedTables.length > 0 && trangThai !== 'HỦY') {
      const conflictMsg = conflictedSelectedTables
        .map(
          (c) =>
            `Bàn ${c.tableId} (đã đặt bởi ${c.booking.ten_khach || 'Khách'} - ${c.booking.sdt || ''} lúc ${c.booking.gio_dat || ''})`
        )
        .join(', ');
      errs.tables = `Trùng lịch đặt bàn ngày ${formatDateDisplay(ngayDat)}: ${conflictMsg}. Vui lòng bỏ chọn bàn này hoặc dời sang ngày khác!`;
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

  // 1. Mark tables booked by others on target date in red
  occupiedTablesOnTargetDateMap.forEach((_, normId) => {
    customBadges[normId] = {
      label: 'ĐÃ ĐẶT',
      bg: '#ef4444',
      text: '#ffffff',
    };
  });

  // 2. Mark selected tables
  selectedTables.forEach((tId) => {
    const isConflicted = occupiedTablesOnTargetDateMap.has(normalizeTableId(tId));
    if (isConflicted) {
      customBadges[tId] = {
        label: 'TRÙNG',
        bg: '#dc2626',
        text: '#ffffff',
      };
    } else {
      const isNew = !originalTables.includes(tId);
      customBadges[tId] = {
        label: isNew ? 'MỚI' : 'CHỌN',
        bg: isNew ? '#22c55e' : '#facc15',
        text: isNew ? '#ffffff' : '#020617',
      };
    }
  });

  const isTableDisabled = (tableId: string, currentStatus: TableStatusClass) => {
    const norm = normalizeTableId(tableId);
    // Bàn này đã có người đặt trên ngày đang xem -> Không cho phép chọn
    if (occupiedTablesOnTargetDateMap.has(norm)) return true;

    // Nếu dời sang ngày khác, các bàn không bị người khác đặt đều có thể chọn
    if (isDateChanged) {
      return false;
    }

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
                <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                  Sửa thông tin đơn đặt: <span className="text-amber-400">{booking.id_dat}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cập nhật khách hàng, dời ngày đặt hoặc đổi danh sách bàn
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-edit-booking-modal"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Ngày đặt bàn <span className="text-red-400">*</span>
                  </span>
                  {isDateChanged && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Đã đổi ngày
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  id="edit-input-ngay-dat"
                  value={ngayDat}
                  onChange={(e) => {
                    setNgayDat(e.target.value);
                    if (errors.ngay_dat) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.ngay_dat;
                        return next;
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    errors.ngay_dat ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-700'
                  }`}
                />

                {/* Quick future date selector chips */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400">Dời nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(1)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    +1 Ngày (Mai)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(2)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    +2 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(3)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    +3 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDays(7)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors"
                  >
                    +7 Ngày
                  </button>
                </div>

                {errors.ngay_dat && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{errors.ngay_dat}</span>
                  </p>
                )}
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

            {/* Real-time Date Conflict Status Banner */}
            {isDateChanged && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                  newDateNormalized < tomorrowStr
                    ? 'bg-red-950/40 border-red-700/80 text-red-200'
                    : conflictedSelectedTables.length > 0
                    ? 'bg-amber-950/50 border-amber-600/80 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
                }`}
              >
                {newDateNormalized < tomorrowStr ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-red-300">Không thể dời về hôm nay hoặc quá khứ:</strong>
                      <span>
                        Chỉ có thể đổi ngày thành ngày của tương lai (từ {formatDateDisplay(tomorrowStr)} trở đi). Vui lòng chọn ngày khác!
                      </span>
                    </div>
                  </>
                ) : conflictedSelectedTables.length > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-amber-300">
                        Cảnh báo: Có bàn bị trùng lịch vào ngày {formatDateDisplay(ngayDat)}!
                      </strong>
                      <span>
                        Các bàn đã chọn [
                        {conflictedSelectedTables.map((c) => `Bàn ${c.tableId}`).join(', ')}
                        ] đã có khách khác đặt trước. Hãy chọn các bàn Trống màu Vàng bên dưới để tránh bị trùng!
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-emerald-300">
                        Ngày dời lịch hợp lệ ({formatDateDisplay(ngayDat)}):
                      </strong>
                      <span>
                        Các bàn đã chọn hiện đang TRỐNG vào ngày này, không phát hiện trùng lịch.
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

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
                    {Array.from<string>(selectedTables).map((tId) => {
                      const isConflicted = occupiedTablesOnTargetDateMap.has(normalizeTableId(tId));
                      return (
                        <span
                          key={tId}
                          className={`px-2 py-0.5 rounded text-[11px] font-black shadow flex items-center gap-1 ${
                            isConflicted
                              ? 'bg-red-600 text-white animate-pulse'
                              : originalTables.includes(tId) && !isDateChanged
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          Bàn {tId} {isConflicted ? '(Trùng!)' : ''}
                          <button
                            type="button"
                            onClick={() => handleToggleTable(tId)}
                            className="hover:text-red-900 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
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
                    <MapIcon className="w-3 h-3" /> Sơ đồ bàn
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
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center">
                  <BlueprintScaler naturalWidth={436} naturalHeight={560}>
                    <FloorBlueprint
                      tables={tables}
                      statusMap={statusMap}
                      selectedTables={selectedTables}
                      onToggleTable={handleToggleTable}
                      isTableDisabled={isTableDisabled}
                      customBadges={customBadges}
                      compact
                    />
                  </BlueprintScaler>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {tables.map((t) => {
                      const norm = normalizeTableId(t.id);
                      const isOccupiedOnTargetDate = occupiedTablesOnTargetDateMap.has(norm);
                      const st = statusMap[t.id] || t.status || 'empty';
                      const isSelected = selectedTables.has(t.id);
                      const isOriginal = originalTables.includes(t.id);
                      const isEmpty = isDateChanged ? !isOccupiedOnTargetDate : st === 'empty';

                      let btnClass = 'bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed';
                      if (isOccupiedOnTargetDate) {
                        btnClass = 'bg-red-900/40 text-red-400 border border-red-700/60 opacity-60 cursor-not-allowed';
                      } else if (isSelected) {
                        btnClass = isOriginal && !isDateChanged
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
                          disabled={isOccupiedOnTargetDate || (!isEmpty && !isSelected)}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center justify-center transition-all ${btnClass}`}
                        >
                          <span className="font-bold">{t.name.replace('Bàn ', '')}</span>
                          <span className="text-[9px] opacity-75">
                            {isOccupiedOnTargetDate
                              ? 'Đã đặt'
                              : isSelected
                              ? isOriginal && !isDateChanged
                                ? 'Đang gán'
                                : 'Thêm mới'
                              : isEmpty
                              ? 'Trống'
                              : 'Bận'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons inside form */}
            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-end gap-3">
              <button
                type="button"
                id="btn-cancel-edit-booking"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                id="btn-save-edit-booking"
                disabled={
                  isSubmitting ||
                  (isDateChanged && (newDateNormalized < tomorrowStr || conflictedSelectedTables.length > 0))
                }
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
