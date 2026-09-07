// src/features/floorplan/components/TableDetailModal.tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Users,
  DollarSign,
  FileText,
  Utensils,
  ArrowRightLeft,
  Link2,
  CheckCircle2,
  UserCheck,
  LogOut,
  Ban,
  Lock,
  Unlock,
  PlusCircle,
  ExternalLink,
  Edit,
} from 'lucide-react';
import { BookingPayload, OrderMenuItem, TableItem, TableStatusClass } from '../../../types';
import { STATUS_COLORS } from '../../../config/constants';
import { formatVND, formatTimeDual } from '../../../utils/formatters';

interface TableDetailModalProps {
  isOpen: boolean;
  table: TableItem | null;
  status: TableStatusClass;
  booking: BookingPayload | null;
  orderItems?: OrderMenuItem[];
  onClose: () => void;
  onOpenBookingModal: (tableId: string) => void;
  onOpenMoveModal: (booking: BookingPayload, tableId: string) => void;
  onOpenLinkModal: (booking: BookingPayload, tableId: string) => void;
  onOpenMenuDetail: (booking: BookingPayload) => void;
  onOpenEditBooking?: (booking: BookingPayload) => void;
  onUpdateStatus: (booking: BookingPayload, newStatus: 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'ĐÃ VỀ' | 'HỦY') => void;
  onToggleLock: (tableId: string) => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  isOpen,
  table,
  status,
  booking,
  orderItems = [],
  onClose,
  onOpenBookingModal,
  onOpenMoveModal,
  onOpenLinkModal,
  onOpenMenuDetail,
  onOpenEditBooking,
  onUpdateStatus,
  onToggleLock,
}) => {
  if (!isOpen || !table) return null;

  const statusConfig = STATUS_COLORS[status] || STATUS_COLORS.empty;
  const isOccupied = Boolean(booking && status !== 'empty' && status !== 'inactive');

  return (
    <AnimatePresence>
      <div
        id="table-detail-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          id="table-detail-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{
              backgroundColor: status === 'empty' ? '#1e293b' : statusConfig.bg,
              color: status === 'empty' ? '#f8fafc' : statusConfig.text,
              borderColor: '#334155',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-lg bg-black/40 text-white font-black text-sm border border-white/20">
                {table.name}
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base tracking-wide uppercase">
                  {statusConfig.label} ({table.capacity || 4} khách)
                </h3>
                <p className="text-[11px] opacity-85 font-medium">
                  {table.zone === 'GREEN'
                    ? 'Khu Vực Xanh (Sân vườn)'
                    : table.zone === 'VIP'
                    ? 'Phòng VIP / Hội trường'
                    : 'Khu Vực Trệt'}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-table-detail"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Case A: Table has Active Booking -> Full Representative Customer Info */}
            {isOccupied && booking ? (
              <div className="flex flex-col gap-4">
                {/* 1. Customer Representative Card */}
                <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 shadow flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      Thông tin người đại diện đặt bàn
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-700">
                        {booking.id_dat}
                      </span>
                      {onOpenEditBooking && (
                        <button
                          type="button"
                          id="btn-edit-booking-from-detail"
                          onClick={() => {
                            onClose();
                            onOpenEditBooking(booking);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow transition-all active:scale-95"
                          title="Sửa mọi thông tin khách hàng và đổi bàn"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Sửa thông tin
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Họ tên khách:</span>
                      <strong className="text-sm text-white">{booking.ten_khach}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                      <a
                        href={`tel:${booking.sdt}`}
                        className="text-sm font-bold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {booking.sdt}
                      </a>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Thời gian đặt:</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {formatTimeDual(booking.gio_dat)} • {booking.ngay_dat}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Số lượng khách:</span>
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        {booking.so_khach} người
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Tiền cọc:</span>
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {formatVND(booking.tien_coc)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Người ghi nhận:</span>
                      <span className="text-slate-300 font-medium">{booking.nguoi_nhap || 'Chủ SMO'}</span>
                    </div>
                  </div>

                  {booking.ghi_chu && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-200">Ghi chú:</strong> {booking.ghi_chu}
                      </span>
                    </div>
                  )}

                  {/* Group Tables (Master - Slave) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60 text-xs">
                    <span className="text-slate-400">Nhóm bàn ghép của đơn:</span>
                    <div className="flex flex-wrap gap-1">
                      {booking.danh_sach_ban.map((tId) => (
                        <span
                          key={tId}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            tId === table.id
                              ? 'bg-amber-500 text-slate-950 ring-1 ring-white'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          Bàn {tId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Order Menu Preview */}
                <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                      Món ăn đặt trước ({orderItems.length} món)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMenuDetail(booking);
                      }}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Quản lý thực đơn
                    </button>
                  </div>

                  {orderItems.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {orderItems.map((item) => (
                        <div
                          key={item.id_mon}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60 border border-slate-800"
                        >
                          <span className="text-slate-200">
                            <strong className="text-amber-400">{item.so_luong}x</strong> {item.ten_mon}
                          </span>
                          <span className="font-mono text-slate-300">
                            {formatVND((item.don_gia || 0) * item.so_luong)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-1 text-center">
                      Chưa có món ăn nào trong đơn.
                    </p>
                  )}
                </div>

                {/* 3. Core Business Actions (Dời Bàn & Gộp Nối Bàn) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    id="btn-trigger-move-table"
                    onClick={() => {
                      onClose();
                      onOpenMoveModal(booking, table.id);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    DỜI BÀN (Group Transfer)
                  </button>

                  <button
                    type="button"
                    id="btn-trigger-link-table"
                    onClick={() => {
                      onClose();
                      onOpenLinkModal(booking, table.id);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <Link2 className="w-4 h-4" />
                    GỘP / NỐI THÊM BÀN
                  </button>
                </div>

                {/* 4. Fast Status Updates */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-700/60">
                  {booking.trang_thai !== 'ĐÃ XÁC NHẬN' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(booking, 'ĐÃ XÁC NHẬN')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Xác nhận
                    </button>
                  )}

                  {booking.trang_thai !== 'ĐÃ ĐẾN' && booking.trang_thai !== 'ĐÃ VỀ' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(booking, 'ĐÃ ĐẾN')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Đã đến
                    </button>
                  )}

                  {/* Nút Đã về: Điều kiện Bàn đang có trạng thái ĐÃ ĐẾN mới sử dụng được, sau đó trả lại Bàn trống */}
                  {(booking.trang_thai === 'ĐÃ ĐẾN' || status === 'arrived') && (
                    <button
                      type="button"
                      id="btn-mark-table-leave"
                      onClick={() => onUpdateStatus(booking, 'ĐÃ VỀ')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors shadow"
                      title="Khách đã ăn xong và về, trả lại Bàn trống màu vàng"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Đã về
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onUpdateStatus(booking, 'HỦY')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Hủy đặt
                  </button>
                </div>
              </div>
            ) : status === 'empty' ? (
              /* Case B: Table is Empty */
              <div className="flex flex-col gap-4 py-2 text-center">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col items-center gap-2">
                  <span className="text-3xl">🪑</span>
                  <h4 className="text-base font-bold text-white">{table.name} đang TRỐNG</h4>
                  <p className="text-xs text-slate-300 max-w-xs">
                    Sức chứa tiêu chuẩn: <strong>{table.capacity || 4} khách</strong>. Bạn có thể tiến hành tạo đơn đặt bàn ngay bây giờ.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id="btn-book-this-table-now"
                    onClick={() => {
                      onClose();
                      onOpenBookingModal(table.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    ĐẶT BÀN NÀY NGAY
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleLock(table.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Khóa bàn
                  </button>
                </div>
              </div>
            ) : (
              /* Case C: Table is Locked/Inactive */
              <div className="flex flex-col gap-4 py-2 text-center">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col items-center gap-2">
                  <Lock className="w-8 h-8 text-zinc-400" />
                  <h4 className="text-base font-bold text-white">{table.name} đang bị KHÓA</h4>
                  <p className="text-xs text-slate-400">
                    Bàn hiện không thể nhận đặt. Bạn có thể mở khóa để đưa bàn về trạng thái Trống.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onToggleLock(table.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-xs shadow transition-all active:scale-95"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  MỞ KHÓA BÀN NÀY
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
