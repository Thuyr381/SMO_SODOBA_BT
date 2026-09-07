// src/features/menu/DeleteConfirmModal.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { OrderMenuItem } from '../../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: OrderMenuItem | null;
  onClose: () => void;
  onConfirmDelete: (idMon: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmDelete,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmDelete(item.id_mon);
      onClose();
    } catch (err) {
      console.error('Lỗi khi xóa món:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div id="delete-confirm-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          id="delete-confirm-modal-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Xác nhận xóa món ăn?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Bạn có chắc chắn muốn xóa <strong className="text-rose-400 font-bold">"{item.ten_mon}"</strong> (SL: {item.so_luong}) khỏi đơn hàng?
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                * Thao tác Soft Delete: chuyển trạng thái sang <span className="font-mono text-amber-300">ĐÃ XÓA</span> trên sheet DATMON.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full mt-2">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-colors"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang xóa...' : 'Đồng ý xóa'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
