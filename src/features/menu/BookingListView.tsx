// src/features/menu/BookingListView.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BookingPayload, OrderMenuItem } from '../../types';
import { formatVND, getTodayDateString, formatTimeDual } from '../../utils/formatters';
import { formatTableListDisplay, isDateMatching } from '../../utils/tableHelper';
import { gasApi } from '../../services/gasApi';
import {
  Search,
  Users,
  Utensils,
  CheckCircle2,
  UserCheck,
  Ban,
  Plus,
  Clock,
  FileText,
  User,
  Edit,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';

interface BookingListViewProps {
  bookings: BookingPayload[];
  onOpenMenuDetail: (booking: BookingPayload) => void;
  onUpdateStatus: (booking: BookingPayload, newStatus: 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'HỦY') => void;
  onNewBookingClick: () => void;
  onOpenEditBooking?: (booking: BookingPayload) => void;
  selectedDate?: string;
  onChangeDate?: (date: string) => void;
  onRefreshBookings?: (forceRefresh?: boolean) => Promise<void>;
}

export const BookingListView: React.FC<BookingListViewProps> = ({
  bookings,
  onOpenMenuDetail,
  onUpdateStatus,
  onNewBookingClick,
  onOpenEditBooking,
  selectedDate,
  onChangeDate,
  onRefreshBookings,
}) => {
  const today = getTodayDateString();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>(() => {
    if (selectedDate === 'ALL') return 'ALL';
    if (selectedDate && selectedDate !== today) return 'CUSTOM';
    return 'TODAY';
  });
  const [customDate, setCustomDate] = useState(() => (selectedDate && selectedDate !== 'ALL' ? selectedDate : today));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [datMonItems, setDatMonItems] = useState<OrderMenuItem[]>(() =>
    gasApi.getCachedAllDatMonMenus({ selectedDate })
  );
  const [isLoadingDatMon, setIsLoadingDatMon] = useState(false);

  // Sync dateFilter if selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      if (selectedDate === 'ALL') {
        setDateFilter('ALL');
      } else if (selectedDate === today) {
        setDateFilter('TODAY');
        setCustomDate(today);
      } else {
        setDateFilter('CUSTOM');
        setCustomDate(selectedDate);
      }
    }
  }, [selectedDate, today]);

  // Tải trực tiếp dữ liệu từ table DATMON của Google Sheet
  const loadDatMonData = useCallback(async (forceRefresh = false) => {
    setIsLoadingDatMon(true);
    setDatMonItems(gasApi.getCachedAllDatMonMenus({ selectedDate }));
    try {
      const items = await gasApi.getAllDatMonMenus({ selectedDate, forceRefresh });
      setDatMonItems(items || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu table DATMON:', err);
    } finally {
      setIsLoadingDatMon(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadDatMonData();
  }, [loadDatMonData]);

  const handleRefreshAll = async () => {
    await Promise.all([loadDatMonData(true), onRefreshBookings?.(true)]);
  };

  // Map số lượng món trong DATMON theo từng id_dat
  // YÊU CẦU: View tổng món thể hiện số lượng món (số loại/dòng món riêng biệt) thay vì số lượng của mỗi món
  // VD: 15 lon bia thì phải hiểu là 1 món nhưng có 15 lon (Vào xem chi tiết mới biết có 15 lon)
  const datMonCountByBooking = useMemo(() => {
    const map: Record<string, number> = {};
    datMonItems.forEach((item) => {
      if (item.id_dat) {
        // Mỗi dòng món ăn trong DATMON được tính là 1 món
        map[item.id_dat] = (map[item.id_dat] || 0) + 1;
      }
    });
    return map;
  }, [datMonItems]);

  const datMonAmountByBooking = useMemo(() => {
    const map: Record<string, number> = {};
    datMonItems.forEach((item) => {
      if (item.id_dat) {
        const qty = Number(item.so_luong) || 1;
        const price = Number(item.don_gia) || 0;
        const total = item.thanh_tien !== undefined ? item.thanh_tien : (price * qty);
        map[item.id_dat] = (map[item.id_dat] || 0) + total;
      }
    });
    return map;
  }, [datMonItems]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. LOẠI BỎ CÁC ĐƠN KHÓA BÀN HOẶC ĐƠN HỦY / NO-SHOW THEO YÊU CẦU:
      // "Đối với các bàn có trạng thái từ Khóa bàn (NO-SHOW bên sheet) thành HỦY thì không cần hiển thị bên tab Đơn & Món -> Chỉ hiển thị các Bàn đã đặt/ xác nhật/ đã đến."
      const rawStatus = (b.trang_thai || '').toString().trim().toUpperCase();
      const isCancelledOrNoShow = rawStatus === 'HỦY' || rawStatus === 'NO-SHOW' || rawStatus.includes('HỦY') || rawStatus.includes('NO-SHOW');
      const isLockRow =
        (b.ten_khach && b.ten_khach.toUpperCase().includes('KHÓA BÀN')) ||
        (b.ghi_chu && b.ghi_chu.toUpperCase().includes('KHÓA BÀN')) ||
        (b.yeu_cau_ban && b.yeu_cau_ban.toUpperCase().includes('KHÓA BÀN'));
      if (isLockRow || isCancelledOrNoShow) {
        return false;
      }

      // Chỉ hiển thị các trạng thái hợp lệ: ĐÃ ĐẶT, ĐÃ XÁC NHẬN, ĐÃ ĐẾN
      const validStatuses = ['ĐÃ ĐẶT', 'ĐÃ XÁC NHẬN', 'ĐÃ ĐẾN'];
      if (!validStatuses.includes(rawStatus)) {
        return false;
      }

      // Search
      const search = searchQuery.toLowerCase().trim();
      const matchSearch =
        !search ||
        b.ten_khach.toLowerCase().includes(search) ||
        b.sdt.includes(search) ||
        (b.id_dat && b.id_dat.toLowerCase().includes(search)) ||
        (b.danh_sach_ban && b.danh_sach_ban.some((t) => t.toLowerCase().includes(search)));

      // Date comparison using robust date normalization
      let matchDate = true;
      if (dateFilter === 'TODAY') {
        matchDate = isDateMatching(b.ngay_dat, today);
      } else if (dateFilter === 'CUSTOM') {
        matchDate = isDateMatching(b.ngay_dat, customDate);
      }

      // Status
      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        matchStatus = b.trang_thai === statusFilter;
      }

      return matchSearch && matchDate && matchStatus;
    });
  }, [bookings, searchQuery, dateFilter, customDate, statusFilter, today]);

  // Tính tổng số lượng món ăn của các đơn đang được lọc/hiển thị trên màn hình
  const displayedDishesCount = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (datMonCountByBooking[b.id_dat || ''] || 0), 0);
  }, [filteredBookings, datMonCountByBooking]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ĐÃ XÁC NHẬN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ĐÃ ĐẾN':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'HỦY':
        return 'bg-slate-700/50 text-slate-400 border-slate-600/30 line-through';
      case 'ĐÃ ĐẶT':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div id="booking-list-view" className="w-full flex flex-col gap-4">
      {/* DATMON Connection Status Banner */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                CHỨC NĂNG ĐẶT MÓN
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-all whitespace-nowrap shrink-0 ${
                  displayedDishesCount > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {filteredBookings.length > 0
                    ? `${displayedDishesCount} món (${filteredBookings.length} đơn đặt bàn)`
                    : (dateFilter === 'ALL' ? '0 đơn đặt bàn (0 món)' : 'Ngày này chưa có đơn đặt bàn nào (0 món)')}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-refresh-datmon"
              onClick={handleRefreshAll}
              disabled={isLoadingDatMon}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingDatMon ? 'animate-spin' : ''}`} />
              <span>Đồng bộ DATMON</span>
            </button>
            <button
              type="button"
              id="btn-new-booking-top"
              onClick={onNewBookingClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Đặt bàn mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* DANH SÁCH ĐƠN ĐẶT BÀN */}
      <>
        {/* Top Filter & Search Controls */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="search-booking-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên khách, SĐT, mã đơn (S8-...), số bàn..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick Date Filters */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  id="filter-date-all"
                  onClick={() => {
                    setDateFilter('ALL');
                    onChangeDate?.('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    dateFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Tất cả ngày
                </button>
                <button
                  type="button"
                  id="filter-date-today"
                  onClick={() => {
                    setDateFilter('TODAY');
                    setCustomDate(today);
                    onChangeDate?.(today);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    dateFilter === 'TODAY'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Hôm nay
                </button>
                <div className="flex items-center gap-1 pl-1">
                  <input
                    type="date"
                    id="filter-date-custom-input"
                    value={customDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDate(val);
                      setDateFilter('CUSTOM');
                      if (val) onChangeDate?.(val);
                    }}
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* New Booking Button */}
              <button
                type="button"
                id="btn-create-new-booking"
                onClick={onNewBookingClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>TẠO ĐƠN MỚI</span>
              </button>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800 text-xs overflow-x-auto no-scrollbar whitespace-nowrap">
              <span className="text-slate-400 text-[11px] font-semibold whitespace-nowrap shrink-0">Trạng thái:</span>
              {['ALL', 'ĐÃ ĐẶT', 'ĐÃ XÁC NHẬN', 'ĐÃ ĐẾN'].map((st) => (
                <button
                  key={st}
                  type="button"
                  id={`filter-status-${st}`}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    statusFilter === st
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : st}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-slate-400 whitespace-nowrap shrink-0 pl-2">
                Hiển thị <strong>{filteredBookings.length}</strong> đơn
              </span>
            </div>
          </div>

          {/* Booking Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBookings.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
                <Info className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-300">Không có đơn đặt bàn nào phù hợp bộ lọc.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Nếu bạn vừa tạo đơn trên Google Sheet, hãy nhấn nút "Đồng bộ DATMON" hoặc đổi ngày để xem.
                </p>
              </div>
            ) : (
              filteredBookings.map((b) => {
                const formattedTables =
                  b.danh_sach_ban && b.danh_sach_ban.length > 0
                    ? formatTableListDisplay(b.danh_sach_ban)
                    : 'Chưa gán bàn';

                const countInDatMon = datMonCountByBooking[b.id_dat] || 0;
                const amountInDatMon = datMonAmountByBooking[b.id_dat] || 0;

                return (
                  <div
                    key={b.id_dat}
                    id={`booking-card-${b.id_dat}`}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md flex flex-col justify-between gap-2.5 transition-all"
                  >
                    {/* Dòng 1: Mã đơn & Trạng thái */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap shrink-0">
                        {b.id_dat}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${getStatusBadge(b.trang_thai)}`}>
                        {b.trang_thai || 'ĐÃ ĐẶT'}
                      </span>
                    </div>

                    {/* Dòng 2: Khung thời gian & Bàn nằm dưới dòng Mã và Trạng thái */}
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{formatTimeDual(b.gio_dat)} • {b.ngay_dat}</span>
                      </div>
                      <div className="text-xs text-amber-400 font-black whitespace-nowrap">
                        Bàn: {formattedTables}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{b.ten_khach}</span>
                    </h3>

                    {/* Details row: Phone, guests, deposit, creator */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Số điện thoại:</span>
                        <strong className="text-slate-200 font-mono">{b.sdt}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Số lượng khách:</span>
                        <strong className="text-slate-200">{b.so_khach} người</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Tiền cọc:</span>
                        <strong className="text-emerald-400">{formatVND(b.tien_coc)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Món trong DATMON:</span>
                        <div className={countInDatMon > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {countInDatMon > 0 ? (
                            <div className="flex flex-col">
                              <span>{countInDatMon} món</span>
                              <span className="text-emerald-400 text-[11px] font-extrabold">{formatVND(amountInDatMon)}</span>
                            </div>
                          ) : (
                            'Chưa có món'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Note if available */}
                    {b.ghi_chu && (
                      <div className="text-xs text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="italic">{b.ghi_chu}</span>
                      </div>
                    )}

                    {/* Actions footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      {/* Quản lý món & Sửa thông tin Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id={`btn-manage-menu-${b.id_dat}`}
                          onClick={() => onOpenMenuDetail(b)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            countInDatMon > 0
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md'
                              : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40'
                          }`}
                        >
                          <Utensils className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{countInDatMon > 0 ? `Xem món (${countInDatMon} món • ${formatVND(amountInDatMon)})` : '+ Đặt món vào DATMON'}</span>
                        </button>

                        {onOpenEditBooking && (
                          <button
                            type="button"
                            id={`btn-edit-booking-${b.id_dat}`}
                            onClick={() => onOpenEditBooking(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold whitespace-nowrap transition-all"
                            title="Sửa thông tin khách & đổi bàn"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Sửa</span>
                          </button>
                        )}
                      </div>

                      {/* Status transition shortcuts */}
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {b.trang_thai !== 'ĐÃ XÁC NHẬN' && b.trang_thai !== 'HỦY' && (
                          <button
                            type="button"
                            id={`btn-confirm-booking-${b.id_dat}`}
                            onClick={() => onUpdateStatus(b, 'ĐÃ XÁC NHẬN')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/30 text-amber-300 hover:bg-amber-600 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Xác nhận</span>
                          </button>
                        )}

                        {b.trang_thai !== 'ĐÃ ĐẾN' && b.trang_thai !== 'HỦY' && (
                          <button
                            type="button"
                            id={`btn-arrive-booking-${b.id_dat}`}
                            onClick={() => onUpdateStatus(b, 'ĐÃ ĐẾN')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
                          >
                            <UserCheck className="w-3 h-3 shrink-0" />
                            <span>Đã đến</span>
                          </button>
                        )}

                        {b.trang_thai !== 'HỦY' && (
                          <button
                            type="button"
                            id={`btn-cancel-booking-${b.id_dat}`}
                            onClick={() => onUpdateStatus(b, 'HỦY')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
                          >
                            <Ban className="w-3 h-3 shrink-0" />
                            <span>Hủy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
    </div>
  );
};
