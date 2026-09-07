// src/features/settings/components/GasAuthModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, KeyRound, Eye, EyeOff, X, AlertCircle, ShieldCheck } from 'lucide-react';

interface GasAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GasAuthModal: React.FC<GasAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus and reset when opened
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setIsShaking(false);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setError('Vui lòng nhập mật khẩu quản trị.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.focus();
      return;
    }

    if (trimmedPassword === 'smo_vungmanh') {
      setError('');
      onSuccess();
    } else {
      setError('Mật khẩu không chính xác! Vui lòng thử lại.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.select();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="gas-auth-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            id="gas-auth-modal-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-amber-500/20 via-slate-800 to-slate-900 p-5 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Bảo mật Tab Sheet / GAS
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Yêu cầu mật khẩu quản trị để vào tab này
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-gas-auth-modal"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Khu vực cấu hình hệ thống Google Sheets và mã nguồn Google Apps Script được bảo vệ. Vui lòng nhập mật khẩu xác thực để tiếp tục.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="gas-password-input"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Mật khẩu truy cập
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="gas-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Nhập mật khẩu..."
                    autoComplete="current-password"
                    className={`w-full bg-slate-950 border ${
                      error ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700 focus:border-amber-500'
                    } rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors`}
                  />
                  <button
                    type="button"
                    id="btn-toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  id="btn-cancel-gas-auth"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btn-submit-gas-auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Mở khóa Tab
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
