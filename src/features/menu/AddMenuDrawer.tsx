// src/features/menu/AddMenuDrawer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MasterMenuItem } from '../../types';
import { formatVND } from '../../utils/formatters';
import { gasApi } from '../../services/gasApi';
import { X, Search, Plus, Minus, Utensils, Check, ShoppingBag } from 'lucide-react';

interface AddMenuDrawerProps {
  isOpen: boolean;
  idDat: string;
  onClose: () => void;
  onConfirmAdd: (items: Array<{ ten_mon: string; so_luong: number; don_gia?: number; ghi_chu?: string }>) => Promise<void>;
}

export const AddMenuDrawer: React.FC<AddMenuDrawerProps> = ({
  isOpen,
  idDat,
  onClose,
  onConfirmAdd,
}) => {
  const [masterList, setMasterList] = useState<MasterMenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Map of masterMenuId to quantity chosen
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Hiển thị cache ngay rồi cập nhật ngầm từ MENU_MON.
      setMasterList(gasApi.getCachedMasterMenus());
      gasApi.getMasterMenus().then((data) => {
        // Giữ nguyên toàn bộ món (kể cả món INACTIVATE) để làm tối màu & khóa chọn theo yêu cầu
        setMasterList(data);
      });
      setQuantities({});
      setNotes({});
      setSearchQuery('');
    }
  }, [isOpen]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    masterList.forEach((m) => {
      if (m.danh_muc) set.add(m.danh_muc);
    });
    return ['ALL', ...Array.from(set)];
  }, [masterList]);

  // Filtered menu
  const filteredList = useMemo(() => {
    return masterList.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.ten_mon.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.danh_muc && item.danh_muc.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || item.danh_muc === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [masterList, searchQuery, selectedCategory]);

  const handleUpdateQty = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleSetDirectQty = (itemId: string, val: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, val);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleUpdateNote = (itemId: string, text: string) => {
    setNotes((prev) => ({
      ...prev,
      [itemId]: text,
    }));
  };

  const totalSelectedCount = (Object.values(quantities) as number[]).reduce((a: number, b: number) => a + b, 0);

  const totalSelectedPrice = useMemo(() => {
    let sum = 0;
    (Object.entries(quantities) as [string, number][]).forEach(([masterId, qty]) => {
      const item = masterList.find((m) => m.id_mon_master === masterId);
      if (item && qty > 0) {
        sum += (item.don_gia || 0) * qty;
      }
    });
    return sum;
  }, [quantities, masterList]);

  const handleSubmit = async () => {
    if (totalSelectedCount === 0) return;

    const itemsToAdd: Array<{ ten_mon: string; so_luong: number; don_gia?: number; ghi_chu?: string }> = [];
    (Object.entries(quantities) as [string, number][]).forEach(([masterId, qty]) => {
      if (qty > 0) {
        const item = masterList.find((m) => m.id_mon_master === masterId);
        if (item) {
          itemsToAdd.push({
            ten_mon: item.ten_mon,
            so_luong: Number(qty),
            don_gia: item.don_gia,
            ghi_chu: notes[masterId]?.trim() || '',
          });
        }
      }
    });

    setIsSubmitting(true);
    try {
      await onConfirmAdd(itemsToAdd);
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm món:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="add-menu-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
        <motion.div
          id="add-menu-drawer-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">CHỌN MÓN TỪ THỰC ĐƠN (MENU_MON)</h3>
                <p className="text-xs text-amber-400">Đơn hàng: {idDat}</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-close-add-menu"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-col gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-dish-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm món ăn, lẩu, khai vị, nước ngọt..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả món' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes List */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2">
            {filteredList.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Không tìm thấy món ăn nào phù hợp với từ khóa
              </div>
            ) : (
              filteredList.map((item) => {
                const qty = quantities[item.id_mon_master] || 0;
                const isInactive = item.trang_thai === 'INACTIVATE' || item.trang_thai === 'INACTIVE';

                return (
                  <div
                    key={item.id_mon_master}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      isInactive
                        ? 'opacity-40 grayscale bg-slate-950/60 border-rose-900/30 select-none cursor-not-allowed'
                        : qty > 0
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : 'bg-slate-850/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isInactive ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {item.ten_mon}
                          </h4>
                          {isInactive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                              HẾT / TẠM NGƯNG
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-xs font-bold ${isInactive ? 'text-slate-500' : 'text-amber-400'}`}>
                            {formatVND(item.don_gia)}
                          </span>
                          {item.danh_muc && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.danh_muc}
                            </span>
                          )}
                          {!isInactive && qty > 0 && (
                            <span className="text-xs font-bold text-emerald-400">
                              = {formatVND((item.don_gia || 0) * qty)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controller: [-] [Nhập trực tiếp SL] [+] và nút chọn nhanh +5, +10 */}
                      {isInactive ? (
                        <div className="shrink-0 text-right">
                          <span className="text-[11px] font-semibold text-rose-400/80 italic">Tạm ngưng</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id_mon_master, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700"
                              title="Giảm 1"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}

                          {/* Nhập nhiều số lượng trực tiếp bằng ô input */}
                          <input
                            type="number"
                            min="0"
                            max="999"
                            id={`input-qty-drawer-${item.id_mon_master}`}
                            value={qty > 0 ? qty : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              handleSetDirectQty(item.id_mon_master, isNaN(val) ? 0 : val);
                            }}
                            className="w-12 h-7 text-center font-black text-amber-300 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                            title="Gõ số lượng nhiều trực tiếp vào đây"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id_mon_master, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold hover:bg-amber-400 shadow-sm"
                            title="Tăng 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Phím tắt chọn nhanh +5, +10 */}
                          <div className="flex items-center gap-1 ml-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id_mon_master, 5)}
                              className="px-1.5 h-7 rounded bg-slate-800 hover:bg-amber-500/20 text-[10px] font-bold text-amber-400 border border-slate-700 hover:border-amber-500/40 transition-colors"
                              title="Thêm nhanh 5 phần"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id_mon_master, 10)}
                              className="px-1.5 h-7 rounded bg-slate-800 hover:bg-amber-500/20 text-[10px] font-bold text-amber-400 border border-slate-700 hover:border-amber-500/40 transition-colors"
                              title="Thêm nhanh 10 phần"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Khung Ghi chú cho Đầu bếp khi món đã được chọn */}
                    {!isInactive && qty > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 shrink-0">
                            🧑‍🍳 Ghi chú bếp:
                          </span>
                          <input
                            type="text"
                            placeholder="Ghi chú khẩu vị cho đầu bếp..."
                            value={notes[item.id_mon_master] || ''}
                            onChange={(e) => handleUpdateNote(item.id_mon_master, e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                          {['Không cay', 'Ít cay', 'Chín kỹ', 'Ít ngọt', 'Không hành', 'Nấu trước'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const current = notes[item.id_mon_master] || '';
                                const next = current ? `${current}, ${tag}` : tag;
                                handleUpdateNote(item.id_mon_master, next);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
                            >
                              +{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Confirmation Bar với Tổng tiền & Tổng số món */}
          <div className="p-3.5 bg-slate-800/90 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-xs text-slate-400">Đã chọn: </span>
                <strong className="text-white text-sm font-bold">{totalSelectedCount} món</strong>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-xs text-slate-400">Tổng tiền: </span>
                <strong className="text-emerald-400 text-sm sm:text-base font-extrabold">
                  {formatVND(totalSelectedPrice)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              id="btn-confirm-add-dishes"
              disabled={totalSelectedCount === 0 || isSubmitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition-all active:scale-98 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Đang thêm...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>XÁC NHẬN THÊM MÓN</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
