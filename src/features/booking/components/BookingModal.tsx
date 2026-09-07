// src/features/booking/components/BookingModal.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookingPayload } from '../../../types';
import { getTodayDateString, getCurrentTimeString, formatVND, isValidVietnamesePhone, formatTime24To12 } from '../../../utils/formatters';
import { X, Calendar, Clock, User, Phone, Users, DollarSign, FileText, UserCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  selectedTableIds: string[];
  currentUserName: string;
  onClose: () => void;
  onSubmit: (data: BookingPayload) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  selectedTableIds,
  currentUserName,
  onClose,
  onSubmit,
}) => {
  const [tenKhach, setTenKhach] = useState('');
  const [sdt, setSdt] = useState('');
  const [ngayDat, setNgayDat] = useState(getTodayDateString());
  const [gioDat, setGioDat] = useState(getCurrentTimeString());
  const [soKhach, setSoKhach] = useState<number>(2);
  const [tienCoc, setTienCoc] = useState<number>(0);
  const [ghiChu, setGhiChu] = useState('');
  const [nguoiNhap, setNguoiNhap] = useState(currentUserName || 'Chủ SMO');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update default user if changed
  React.useEffect(() => {
    if (currentUserName) {
      setNguoiNhap(currentUserName);
    }
  }, [currentUserName]);

  // Quick deposit buttons
  const depositPresets = [0, 100000, 200000, 500000, 1000000];

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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        danh_sach_ban: selectedTableIds,
        ten_khach: tenKhach.trim(),
        sdt: sdt.trim(),
        ngay_dat: ngayDat,
        gio_dat: gioDat,
        so_khach: Number(soKhach),
        tien_coc: Number(tienCoc),
        ghi_chu: ghiChu.trim(),
        nguoi_nhap: nguoiNhap.trim() || 'Chủ SMO',
      });
      onClose();
    } catch (err) {
      console.error('Lỗi khi gửi form đặt bàn:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formattedTables = selectedTableIds
    .map((id) => (id.startsWith('VIP') ? id : `Bàn ${id}`))
    .join(', ');

  return (
    <AnimatePresence>
      <div id="booking-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          id="booking-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                📅
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ĐẶT BÀN MỚI TÂN PHÚ (S8)</h3>
                <p className="text-xs text-amber-400 font-semibold">
                  Bàn chọn ({selectedTableIds.length}): {formattedTables}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-booking-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            {/* Tên khách & SĐT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Tên khách hàng <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-ten-khach"
                  value={tenKhach}
                  onChange={(e) => {
                    setTenKhach(e.target.value);
                    if (errors.ten_khach) setErrors({ ...errors, ten_khach: '' });
                  }}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
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
                  id="input-sdt"
                  value={sdt}
                  onChange={(e) => {
                    setSdt(e.target.value);
                    if (errors.sdt) setErrors({ ...errors, sdt: '' });
                  }}
                  placeholder="0901234567"
                  className={`w-full px-3 py-2 rounded-xl bg-slate-800 border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
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
                  id="input-ngay-dat"
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
                  id="input-gio-dat"
                  value={gioDat}
                  onChange={(e) => setGioDat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                {/* Quick Shift Selection Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-slate-400 w-full font-medium">Ca nhanh:</span>
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

            {/* Số lượng khách & Tiền cọc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Số lượng khách (Mặc định 2) <span className="text-red-400">*</span>
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
                    id="input-so-khach"
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
                  id="input-tien-coc"
                  step="50000"
                  min="0"
                  value={tienCoc}
                  onChange={(e) => setTienCoc(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {/* Deposit presets */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {depositPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTienCoc(val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                        tienCoc === val
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {val === 0 ? '0 ₫' : formatVND(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ghi chú & Người nhập */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Ghi chú đặt bàn (Ghế trẻ em, ăn chay, vị trí gần sân khấu...)
              </label>
              <textarea
                id="input-ghi-chu"
                rows={2}
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Ví dụ: Ghế trẻ em, chuẩn bị trước đĩa trái cây..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Người nhập đơn (Tự động từ Telegram User)
              </label>
              <input
                type="text"
                id="input-nguoi-nhap"
                value={nguoiNhap}
                onChange={(e) => setNguoiNhap(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                id="btn-cancel-booking-form"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                id="btn-submit-booking-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>XÁC NHẬN ĐẶT BÀN (S8)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
