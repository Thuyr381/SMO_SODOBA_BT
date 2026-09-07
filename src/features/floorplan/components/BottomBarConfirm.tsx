// src/features/floorplan/components/BottomBarConfirm.tsx
import React from 'react';
import { ActionMode, TableStatusClass } from '../../../types';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarPlus, Ban, CheckCircle2, UserCheck, LogOut, Lock, Unlock, X, ArrowRight, Loader2 } from 'lucide-react';

interface BottomBarConfirmProps {
  selectedTableIds: string[];
  actionMode: ActionMode;
  statusMap?: Record<string, TableStatusClass>;
  isExecuting?: boolean;
  onExecuteAction: () => void;
  onClearSelection: () => void;
}

export const BottomBarConfirm: React.FC<BottomBarConfirmProps> = ({
  selectedTableIds,
  actionMode,
  statusMap = {},
  isExecuting = false,
  onExecuteAction,
  onClearSelection,
}) => {
  if (selectedTableIds.length === 0) return null;

  const isAnyTableInactive = selectedTableIds.some((id) => statusMap[id] === 'inactive');

  // Determine button label and icon based on current mode
  let actionLabel = 'TIẾP TỤC THAO TÁC';
  let buttonClass = 'bg-amber-500 hover:bg-amber-400 text-slate-950';
  let icon = <ArrowRight className="w-4 h-4" />;

  if (actionMode === 'BOOK') {
    actionLabel = 'TIẾP TỤC ĐẶT BÀN';
    buttonClass = 'bg-emerald-500 hover:bg-emerald-400 text-slate-950';
    icon = <CalendarPlus className="w-4 h-4" />;
  } else if (actionMode === 'CANCEL') {
    actionLabel = 'XÁC NHẬN HỦY';
    buttonClass = 'bg-rose-600 hover:bg-rose-500 text-white';
    icon = <Ban className="w-4 h-4" />;
  } else if (actionMode === 'CONFIRM') {
    actionLabel = 'XÁC NHẬN ĐƠN';
    buttonClass = 'bg-amber-500 hover:bg-amber-400 text-slate-950';
    icon = <CheckCircle2 className="w-4 h-4" />;
  } else if (actionMode === 'ARRIVE') {
    actionLabel = 'ĐÃ ĐẾN BÀN';
    buttonClass = 'bg-blue-600 hover:bg-blue-500 text-white';
    icon = <UserCheck className="w-4 h-4" />;
  } else if (actionMode === 'LEAVE') {
    actionLabel = 'XÁC NHẬN ĐÃ VỀ (TRẢ BÀN TRỐNG)';
    buttonClass = 'bg-sky-600 hover:bg-sky-500 text-white font-black shadow-sky-600/50';
    icon = <LogOut className="w-4 h-4" />;
  } else if (actionMode === 'LOCK') {
    if (isAnyTableInactive) {
      actionLabel = 'MỞ KHÓA BÀN (THÀNH TRỐNG VÀNG)';
      buttonClass = 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-yellow-500/50';
      icon = <Unlock className="w-4 h-4 stroke-[2.5]" />;
    } else {
      actionLabel = 'KHÓA TẠM THỜI BÀN';
      buttonClass = 'bg-zinc-700 hover:bg-zinc-600 text-white font-bold';
      icon = <Lock className="w-4 h-4" />;
    }
  }

  // Format table list string: "Bàn 56, 57"
  const formattedTables = selectedTableIds
    .map((id) => (id.startsWith('VIP') ? id : `Bàn ${id}`))
    .join(', ');

  return (
    <AnimatePresence>
      <motion.div
        id="bottom-bar-confirm"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/80 shadow-2xl"
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Info pill */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs">
                {selectedTableIds.length}
              </span>
              <div className="text-xs">
                <span className="text-slate-400">Đã chọn ({selectedTableIds.length}): </span>
                <strong className="text-white font-bold">{formattedTables}</strong>
              </div>
            </div>

            <button
              type="button"
              id="btn-clear-selection"
              onClick={onClearSelection}
              disabled={isExecuting}
              className="sm:hidden p-1 text-slate-400 hover:text-white disabled:opacity-40"
              title="Bỏ chọn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-cancel-selection-desktop"
              onClick={onClearSelection}
              disabled={isExecuting}
              className="hidden sm:flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
              Bỏ chọn
            </button>

            <button
              type="button"
              id="btn-bottom-confirm-action"
              onClick={onExecuteAction}
              disabled={isExecuting}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-lg transition-all active:scale-98 disabled:opacity-50 ${buttonClass}`}
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
              <span>{isExecuting ? 'ĐANG LƯU GOOGLE SHEETS...' : actionLabel}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
