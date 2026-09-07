// src/features/menu/EditMenuModal.tsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { OrderMenuItem } from '../../types';
import { formatVND } from '../../utils/formatters';
import { X, Edit3, CheckCircle2, Trash2, DollarSign } from 'lucide-react';

interface EditMenuModalProps {
  isOpen: boolean;
  item: OrderMenuItem | null;
  onClose: () => void;
  onUpdate: (idMon: string, newQty: number, newName: string, newGhiChu?: string) => Promise<void>;
  onDeleteRequest: (item: OrderMenuItem) => void;
}

export const EditMenuModal: React.FC<EditMenuModalProps> = ({
  isOpen,
  item,
  onClose,
  onUpdate,
  onDeleteRequest,
}) => {
  const [tenMon, setTenMon] = useState('');
  const [soLuong, setSoLuong] = useState<number | string>(1);
  const [ghiChu, setGhiChu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setTenMon(item.ten_mon);
      setSoLuong(item.so_luong || 1);
      setGhiChu(item.ghi_chu || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const currentQtyNum = Math.max(1, parseInt(String(soLuong), 10) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalQty = Math.max(1, parseInt(String(soLuong), 10) || 1);
    if (!tenMon.trim() || finalQty < 1) return;

    setIsSubmitting(true);
    try {
      await onUpdate(item.id_mon, finalQty, tenMon.trim(), ghiChu.trim());
      onClose();
    } catch (err) {
      console.error('Lỗi khi cập nhật món ăn:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepQty = (delta: number) => {
    setSoLuong((prev) => Math.max(1, (parseInt(String(prev), 10) || 1) + delta));
  };

  return (
    <AnimatePresence>
      <div id="edit-menu-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          id="edit-menu-modal-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Edit3 className="w-4 h-4" />
              <span>CHỈNH SỬA MÓN ĂN</span>
            </div>
            <button
              type="button"
              id="btn-close-edit-menu-modal"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mã món & Mã đơn</label>
              <div className="text-xs text-slate-400 font-mono bg-slate-800/80 p-2 rounded-lg border border-slate-700">
                {item.id_mon} (Đơn: {item.id_dat})
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tên món ăn</label>
              <input
                type="text"
                id="edit-dish-name-input"
                value={tenMon}
                onChange={(e) => setTenMon(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Số lượng phần (Có thể nhập tay trực tiếp)
                </label>
                <span className="text-[11px] text-amber-400 font-medium">
                  {currentQtyNum} phần
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepQty(-1)}
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold hover:bg-slate-700 text-base transition-colors flex items-center justify-center shrink-0"
                  title="Giảm 1"
                >
                  -
                </button>
                <input
                  type="number"
                  id="edit-dish-qty-input"
                  min="1"
                  value={soLuong}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setSoLuong('');
                    } else {
                      const num = parseInt(v, 10);
                      setSoLuong(isNaN(num) ? '' : num);
                    }
                  }}
                  onBlur={() => {
                    const n = parseInt(String(soLuong), 10);
                    if (isNaN(n) || n < 1) {
                      setSoLuong(1);
                    }
                  }}
                  placeholder="Nhập số lượng..."
                  className="flex-1 text-center py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-base font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleStepQty(1)}
                  className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold hover:bg-slate-700 text-base transition-colors flex items-center justify-center shrink-0"
                  title="Tăng 1"
                >
                  +
                </button>
              </div>

              {/* Quick preset chips */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 font-semibold">Tăng nhanh:</span>
                {[+5, +10, +20].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleStepQty(delta)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors"
                  >
                    +{delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú cho Đầu bếp */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <span>🧑‍🍳 Ghi chú cho Đầu bếp</span>
                <span className="text-[10px] text-slate-500 font-normal">(Khẩu vị, dặn bếp, thứ tự ra món)</span>
              </label>
              <input
                type="text"
                id="edit-dish-note-input"
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="Vd: Không cay, ít ngọt, làm chín kỹ, lên trước..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
              />
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {['Không cay', 'Ít cay', 'Chín kỹ', 'Ít ngọt', 'Không hành', 'Nấu trước', 'Lên sau'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setGhiChu((prev) => (prev ? `${prev}, ${tag}` : tag));
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[10px] font-semibold border border-slate-700 hover:border-amber-500/30 transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Hiển thị đơn giá & Thành tiền dự tính */}
            {item.don_gia ? (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Đơn giá</span>
                  <span className="font-bold text-amber-400">{formatVND(item.don_gia)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Thành tiền ({currentQtyNum} phần)</span>
                  <span className="font-black text-emerald-400 text-sm">{formatVND((item.don_gia || 0) * currentQtyNum)}</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                id="btn-delete-from-edit-modal"
                onClick={() => {
                  onClose();
                  onDeleteRequest(item);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa món
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  id="btn-save-edit-dish"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
