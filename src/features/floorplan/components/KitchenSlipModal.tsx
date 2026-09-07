// src/features/floorplan/components/KitchenSlipModal.tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Printer, X, Check, Utensils, Clock, User, Phone, ArrowRight, FileText } from 'lucide-react';
import { BookingPayload, OrderMenuItem } from '../../../types';
import { formatVND } from '../../../utils/formatters';

interface KitchenSlipModalProps {
  isOpen: boolean;
  oldTables: string[];
  newTables: string[];
  booking: BookingPayload | null;
  orderItems?: OrderMenuItem[];
  onClose: () => void;
}

export const KitchenSlipModal: React.FC<KitchenSlipModalProps> = ({
  isOpen,
  oldTables,
  newTables,
  booking,
  orderItems = [],
  onClose,
}) => {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const oldTablesText = oldTables.map((t) => (t.startsWith('VIP') ? t : `Bàn ${t}`)).join(' + ');
  const newTablesText = newTables.map((t) => (t.startsWith('VIP') ? t : `Bàn ${t}`)).join(' + ');

  return (
    <AnimatePresence>
      <div
        id="kitchen-slip-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="kitchen-slip-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-white text-black border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 print:hidden">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500 text-slate-950 font-black text-xs">
                BẾP & BAR
              </span>
              <h3 className="font-bold text-sm">PHIẾU THÔNG BÁO DỜI BÀN</h3>
            </div>
            <button
              type="button"
              id="btn-close-kitchen-slip"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Ticket Content */}
          <div id="printable-kitchen-slip" className="p-5 flex flex-col gap-3 font-mono text-sm leading-relaxed">
            {/* Header branding */}
            <div className="text-center border-b-2 border-dashed border-black pb-3">
              <h2 className="font-black text-base tracking-wider uppercase">NHÀ HÀNG SODOBA TÂN PHÚ (S8)</h2>
              <p className="text-xs text-slate-600">Đ/c: Thoại Ngọc Hầu, Tân Phú, TP.HCM</p>
              <div className="mt-2 py-1 px-2 bg-black text-white font-black text-sm rounded uppercase inline-block">
                *** PHIẾU BÁO DỜI BÀN (BẾP/BAR) ***
              </div>
            </div>

            {/* Crucial Move Table Notice */}
            <div className="p-3 bg-amber-50 border-2 border-black rounded-lg text-center my-1">
              <div className="text-xs font-bold text-slate-700 uppercase">Lệnh điều chuyển vị trí:</div>
              <div className="text-base sm:text-lg font-black text-red-600 tracking-tight mt-1">
                Chuyển từ [{oldTablesText}] sang [{newTablesText}]
              </div>
            </div>

            {/* Customer & Booking Info */}
            <div className="space-y-1 text-xs border-b border-dashed border-black pb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Mã đơn đặt:</span>
                <span className="font-bold">{booking.id_dat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Khách đại diện:</span>
                <span className="font-bold">{booking.ten_khach}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số điện thoại:</span>
                <span className="font-bold">{booking.sdt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Số lượng khách:</span>
                <span className="font-bold">{booking.so_khach} người</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Thời gian dời:</span>
                <span className="font-bold">{new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}</span>
              </div>
              {booking.ghi_chu && (
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-600">Ghi chú:</span>
                  <span className="font-semibold text-right">{booking.ghi_chu}</span>
                </div>
              )}
            </div>

            {/* Ordered Food items for kitchen */}
            {orderItems && orderItems.length > 0 ? (
              <div className="border-b border-dashed border-black pb-2.5">
                <div className="font-bold text-xs uppercase mb-1.5 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5" />
                  Món ăn đang phục vụ theo đơn ({orderItems.length} món):
                </div>
                <div className="space-y-1 text-xs">
                  {orderItems.map((item, idx) => (
                    <div key={item.id_mon || idx} className="flex justify-between items-center">
                      <span>
                        <strong>{item.so_luong}x</strong> {item.ten_mon}
                      </span>
                      {item.ghi_chu && <span className="text-[11px] italic text-slate-600">({item.ghi_chu})</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs italic text-slate-500 text-center py-1">
                (Chưa có danh sách món ăn đặt trước)
              </div>
            )}

            {/* Instructions */}
            <div className="text-[11px] text-slate-600 text-center italic">
              * Nhân viên Bếp / Bar vui lòng kiểm tra và chuyển món đúng theo vị trí bàn mới <strong>[{newTablesText}]</strong>.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 p-4 bg-slate-100 border-t border-slate-200 print:hidden">
            <button
              type="button"
              id="btn-print-slip"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              In phiếu Bếp/Bar
            </button>
            <button
              type="button"
              id="btn-close-slip-done"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
            >
              Đóng lại
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
