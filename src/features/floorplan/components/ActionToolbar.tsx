// src/features/floorplan/components/ActionToolbar.tsx
import React from 'react';
import { ActionMode } from '../../../types';
import { CalendarPlus, Ban, CheckCircle2, UserCheck, LogOut, Lock, Info, X } from 'lucide-react';

interface ActionToolbarProps {
  currentMode: ActionMode;
  onSelectMode: (mode: ActionMode) => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({ currentMode, onSelectMode }) => {
  const actions: Array<{
    mode: ActionMode;
    label: string;
    icon: React.ReactNode;
    bgClass: string;
    activeClass: string;
    description: string;
    id: string;
  }> = [
    {
      mode: 'BOOK',
      label: 'ĐẶT BÀN',
      icon: <CalendarPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#fdd835] hover:bg-[#fbc02d] text-slate-950 border-[#d4af37]',
      activeClass: 'bg-[#fdd835] text-slate-950 shadow border-black ring-1 ring-black font-black',
      description: 'Chọn các bàn Trống (vàng) để đặt',
      id: 'btn-mode-book',
    },
    {
      mode: 'CANCEL',
      label: 'HỦY ĐẶT',
      icon: <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#d32f2f] hover:bg-[#c62828] text-white border-[#b71c1c]',
      activeClass: 'bg-[#d32f2f] text-white shadow border-white ring-1 ring-red-300 font-black',
      description: 'Chọn 1 bàn trong nhóm, hệ thống tự chọn toàn bộ bàn ghép để hủy',
      id: 'btn-mode-cancel',
    },
    {
      mode: 'CONFIRM',
      label: 'XÁC NHẬN',
      icon: <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#f57c00] hover:bg-[#ef6c00] text-white border-[#e65100]',
      activeClass: 'bg-[#f57c00] text-white shadow border-white ring-1 ring-orange-300 font-black',
      description: 'Chuyển đơn sang ĐÃ XÁC NHẬN (màu cam)',
      id: 'btn-mode-confirm',
    },
    {
      mode: 'ARRIVE',
      label: 'ĐÃ ĐẾN',
      icon: <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#2e7d32] hover:bg-[#1b5e20] text-white border-[#1b5e20]',
      activeClass: 'bg-[#2e7d32] text-white shadow border-white ring-1 ring-emerald-300 font-black',
      description: 'Chuyển sang KHÁCH ĐÃ ĐẾN (màu xanh lá)',
      id: 'btn-mode-arrive',
    },
    {
      mode: 'LEAVE',
      label: 'ĐÃ VỀ',
      icon: <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#0369a1]',
      activeClass: 'bg-[#0284c7] text-white shadow border-white ring-1 ring-sky-300 font-black',
      description: 'Bàn ĐÃ ĐẾN trả lại BÀN TRỐNG (ĐÃ VỀ)',
      id: 'btn-mode-leave',
    },
    {
      mode: 'LOCK',
      label: 'KHÓA/MỞ',
      icon: <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />,
      bgClass: 'bg-[#424242] hover:bg-[#303030] text-white border-[#212121]',
      activeClass: 'bg-[#424242] text-white shadow border-white ring-1 ring-zinc-300 font-black',
      description: 'Khóa bàn trống hoặc mở khóa bàn đang khóa',
      id: 'btn-mode-lock',
    },
  ];

  return (
    <div id="action-toolbar" className="w-full bg-slate-900/95 border-b border-slate-800 px-1 sm:px-3 py-1">
      <div className="max-w-[500px] mx-auto flex flex-col gap-0.5">
        {/* 6 Nút chức năng thao tác bàn - Scale gọn gàng, tối ưu diện tích màn hình */}
        <div className="grid grid-cols-6 gap-1">
          {actions.map((item) => {
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                id={item.id}
                onClick={() => onSelectMode(item.mode)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 py-1 px-0.5 rounded-md font-bold text-[9px] sm:text-[10px] transition-all border shadow-xs ${
                  isActive ? item.activeClass : item.bgClass
                }`}
              >
                {item.icon}
                <span className="truncate tracking-tighter uppercase">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Hint Prompt Banner - Rất gọn */}
        {currentMode ? (
          <div
            id="action-mode-guide"
            className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-200 mt-0.5"
          >
            <div className="flex items-center gap-1 truncate">
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong className="text-amber-400">Đang bật: </strong>
                {actions.find((a) => a.mode === currentMode)?.description}
              </span>
            </div>
            <button
              type="button"
              id="btn-clear-mode"
              onClick={() => onSelectMode(null)}
              className="text-[10px] text-zinc-300 hover:text-white flex items-center gap-0.5 ml-1 shrink-0 bg-slate-700 px-1 py-0.2 rounded"
            >
              <X className="w-2.5 h-2.5" /> Tắt
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

