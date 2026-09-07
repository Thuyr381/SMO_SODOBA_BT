// src/features/menu/MenuDetailView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { BookingPayload, OrderMenuItem } from '../../types';
import { formatVND } from '../../utils/formatters';
import { formatTableListDisplay, formatTableStandardCode } from '../../utils/tableHelper';
import { gasApi } from '../../services/gasApi';
import { AddMenuDrawer } from './AddMenuDrawer';
import { EditMenuModal } from './EditMenuModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Utensils, Plus, Edit2, Trash2, ArrowLeft, RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';

interface MenuDetailViewProps {
  booking: BookingPayload;
  onBack: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MenuDetailView: React.FC<MenuDetailViewProps> = ({
  booking,
  onBack,
  onShowToast,
}) => {
  const [menuItems, setMenuItems] = useState<OrderMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderMenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<OrderMenuItem | null>(null);

  // Fetch active menu items for this booking
  const loadMenus = useCallback(async () => {
    if (!booking.id_dat) return;
    setIsLoading(true);
    try {
      // Dùng getOrderMenus an toàn qua GET request, không bao giờ tạo nhầm đơn bên DATBAN
      const items = await gasApi.getOrderMenus(booking.id_dat);
      setMenuItems(items || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách món:', err);
    } finally {
      setIsLoading(false);
    }
  }, [booking.id_dat]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  // Quick quantity change: [-] [SL] [+]
  const handleQuickQtyChange = async (item: OrderMenuItem, delta: number) => {
    const newQty = Math.max(1, item.so_luong + delta);
    if (newQty === item.so_luong) return;

    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((m) => (m.id_mon === item.id_mon ? { ...m, so_luong: newQty } : m))
    );

    try {
      await gasApi.sendAction({
        action: 'UPDATE_MENU',
        id_mon: item.id_mon,
        so_luong: newQty,
        ten_mon: item.ten_mon,
      });
      onShowToast('Cập nhật số lượng', `Đã đổi "${item.ten_mon}" thành ${newQty} phần`, 'success');
    } catch (err) {
      console.error('Lỗi khi cập nhật số lượng món:', err);
      onShowToast('Lỗi cập nhật', 'Không thể cập nhật số lượng món ăn', 'error');
      loadMenus();
    }
  };

  // Set exact quantity by manual text input
  const handleSetExactQty = async (item: OrderMenuItem, targetQty: number) => {
    const validQty = Math.max(1, Math.round(targetQty) || 1);
    if (validQty === item.so_luong) return;

    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((m) => (m.id_mon === item.id_mon ? { ...m, so_luong: validQty } : m))
    );

    try {
      await gasApi.sendAction({
        action: 'UPDATE_MENU',
        id_mon: item.id_mon,
        so_luong: validQty,
        ten_mon: item.ten_mon,
      });
      onShowToast('Cập nhật số lượng', `Đã đổi "${item.ten_mon}" thành ${validQty} phần`, 'success');
    } catch (err) {
      console.error('Lỗi khi cập nhật số lượng món:', err);
      onShowToast('Lỗi cập nhật', 'Không thể cập nhật số lượng món ăn', 'error');
      loadMenus();
    }
  };

  // Add multiple dishes from master list
  const handleConfirmAddDishes = async (
    items: Array<{ ten_mon: string; so_luong: number; don_gia?: number; ghi_chu?: string }>
  ) => {
    if (!booking.id_dat) return;
    try {
      const formattedBanList = formatTableListDisplay(booking.danh_sach_ban);
      const firstTable = Array.isArray(booking.danh_sach_ban) && booking.danh_sach_ban.length > 0
        ? formatTableStandardCode(booking.danh_sach_ban[0])
        : (formattedBanList ? formattedBanList.split(', ')[0] : '');

      await gasApi.sendAction({
        action: 'ADD_MENU',
        id_dat: booking.id_dat,
        items,
        ten_khach: booking.ten_khach,
        ngay_dat: booking.ngay_dat,
        gio_dat: booking.gio_dat,
        so_khach: booking.so_khach,
        danh_sach_ban: formattedBanList,
        ten_ban: firstTable,
      });
      onShowToast('Thêm món thành công', `Đã thêm ${items.length} món ăn vào đơn ${booking.id_dat}`, 'success');
      loadMenus();
    } catch (err) {
      console.error('Lỗi khi thêm món:', err);
      onShowToast('Lỗi', 'Không thể thêm món ăn vào đơn', 'error');
    }
  };

  // Edit dish name/quantity/chef note
  const handleUpdateDish = async (idMon: string, newQty: number, newName: string, newGhiChu?: string) => {
    try {
      await gasApi.sendAction({
        action: 'UPDATE_MENU',
        id_mon: idMon,
        so_luong: newQty,
        ten_mon: newName,
        ghi_chu: newGhiChu,
      });
      onShowToast('Cập nhật thành công', `Đã lưu thay đổi cho món ăn`, 'success');
      loadMenus();
    } catch (err) {
      console.error('Lỗi khi sửa món:', err);
      onShowToast('Lỗi', 'Không thể cập nhật món ăn', 'error');
    }
  };

  // Soft delete dish
  const handleDeleteDish = async (idMon: string) => {
    try {
      await gasApi.sendAction({
        action: 'DELETE_MENU',
        id_mon: idMon,
      });
      onShowToast('Đã xóa món', `Trạng thái món đã chuyển sang ĐÃ XÓA trên sheet DATMON`, 'info');
      // Remove from active view
      setMenuItems((prev) => prev.filter((m) => m.id_mon !== idMon));
    } catch (err) {
      console.error('Lỗi khi xóa món:', err);
      onShowToast('Lỗi', 'Không thể xóa món ăn', 'error');
    }
  };

  // Calculate total amount with priority for thanh_tien from backend
  const totalAmount = menuItems.reduce((acc, item) => {
    return acc + (item.thanh_tien !== undefined ? item.thanh_tien : ((item.don_gia || 0) * item.so_luong));
  }, 0);

  const formattedTables = (booking.danh_sach_ban || [])
    .map((id) => (id.startsWith('VIP') ? id : `Bàn ${id}`))
    .join(', ');

  return (
    <div id="menu-detail-view" className="w-full flex flex-col gap-4">
      {/* Top action header with Live Total Bill */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-back-to-booking-list"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                QUẢN LÝ MÓN ĂN - ĐƠN {booking.id_dat}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {booking.trang_thai || 'ĐÃ ĐẶT'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Khách: <strong className="text-slate-200">{booking.ten_khach}</strong> ({booking.sdt}) • Vị trí: <strong className="text-amber-400">{formattedTables}</strong> • {booking.so_khach} khách
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge tổng tiền trực quan ngay đầu trang */}
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng tiền tạm tính</span>
            <span className="text-sm sm:text-base font-black text-amber-400">{formatVND(totalAmount)}</span>
          </div>

          <button
            type="button"
            id="btn-refresh-menu-detail"
            onClick={loadMenus}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold"
            title="Tải lại danh sách món"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-open-add-menu-drawer"
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition-all active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ THÊM MÓN</span>
          </button>
        </div>
      </div>

      {/* Dishes List */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span>Đang tải danh sách món ăn từ DATMON...</span>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Chưa có món ăn nào được đặt cho bàn này</h4>
              <p className="text-xs text-slate-400 mt-1">Bấm nút "+ Thêm món" phía trên để chọn món từ thực đơn nhà hàng.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
            >
              <Plus className="w-4 h-4" />
              Chọn món ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {menuItems.map((item, idx) => {
              const itemTotal = (item.don_gia || 0) * item.so_luong;
              return (
                <div
                  key={item.id_mon}
                  id={`order-menu-item-${item.id_mon}`}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{item.ten_mon}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                      {item.don_gia ? (
                        <span className="text-slate-400">
                          {formatVND(item.don_gia)} × <strong className="text-amber-400">{item.so_luong}</strong> = <strong className="text-emerald-400 font-bold">{formatVND(itemTotal)}</strong>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold">Số lượng: {item.so_luong}</span>
                      )}
                      {item.ghi_chu ? (
                        <span className="text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <span>🧑‍🍳 Bếp:</span>
                          <strong className="font-semibold">{item.ghi_chu}</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                          title="Thêm ghi chú riêng cho đầu bếp"
                        >
                          + Ghi chú bếp
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Controller: [-] [SL] [+] and [Sửa], [Xóa] */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Fast Qty Controller with manual input */}
                    <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                      <button
                        type="button"
                        id={`btn-dec-qty-${item.id_mon}`}
                        onClick={() => handleQuickQtyChange(item, -1)}
                        className="w-7 h-7 rounded text-slate-300 hover:bg-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Giảm 1 phần"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        id={`input-qty-${item.id_mon}`}
                        defaultValue={item.so_luong}
                        key={`${item.id_mon}-${item.so_luong}`}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0 && val !== item.so_luong) {
                            handleSetExactQty(item, val);
                          } else {
                            e.target.value = String(item.so_luong);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-12 text-center font-bold text-amber-300 text-xs bg-slate-900 border border-slate-700/80 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 hover:border-amber-500/50 transition-colors"
                        title="Nhập tay số lượng món và bấm Enter hoặc nhấp ra ngoài để lưu"
                      />
                      <button
                        type="button"
                        id={`btn-inc-qty-${item.id_mon}`}
                        onClick={() => handleQuickQtyChange(item, 1)}
                        className="w-7 h-7 rounded text-slate-300 hover:bg-slate-700 font-bold text-sm flex items-center justify-center transition-colors"
                        title="Tăng 1 phần"
                      >
                        +
                      </button>
                    </div>

                    {/* Sửa button */}
                    <button
                      type="button"
                      id={`btn-edit-dish-${item.id_mon}`}
                      onClick={() => setEditingItem(item)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs transition-colors"
                      title="Sửa tên / số lượng"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Xóa button (Soft Delete) */}
                    <button
                      type="button"
                      id={`btn-delete-dish-${item.id_mon}`}
                      onClick={() => setDeletingItem(item)}
                      className="p-2 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs transition-colors"
                      title="Xóa món (Soft delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill & Totals summary footer card */}
      {menuItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Tổng cộng thực đơn ({menuItems.length} món)</div>
              <div className="text-lg font-black text-amber-400">{formatVND(totalAmount)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            {booking.tien_coc > 0 && (
              <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                Đã cọc: <strong className="text-emerald-400">{formatVND(booking.tien_coc)}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm món tiếp
            </button>
          </div>
        </div>
      )}

      {/* Drawer & Modals */}
      <AddMenuDrawer
        isOpen={isAddDrawerOpen}
        idDat={booking.id_dat || ''}
        onClose={() => setIsAddDrawerOpen(false)}
        onConfirmAdd={handleConfirmAddDishes}
      />

      <EditMenuModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={handleUpdateDish}
        onDeleteRequest={(item) => setDeletingItem(item)}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirmDelete={handleDeleteDish}
      />
    </div>
  );
};
