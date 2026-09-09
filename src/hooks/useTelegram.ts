// src/hooks/useTelegram.ts
import { useCallback, useEffect, useState } from 'react';

interface TelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  version?: string;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  expand: () => void;
  close: () => void;
  ready: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showAlert?: (message: string, callback?: () => void) => void;
  showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [tg, setTg] = useState<TelegramWebApp | undefined>(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
    }
    return undefined;
  });

  // Script Telegram được tải async để không chặn app; nhận WebApp ngay khi script sẵn sàng.
  useEffect(() => {
    if (tg || typeof document === 'undefined') return;
    const telegramScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://telegram.org/js/telegram-web-app.js"]'
    );
    const handleTelegramReady = () => setTg(window.Telegram?.WebApp);
    handleTelegramReady();
    telegramScript?.addEventListener('load', handleTelegramReady);
    return () => telegramScript?.removeEventListener('load', handleTelegramReady);
  }, [tg]);

  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {
        console.warn('Telegram WebApp expand warning:', e);
      }
    }
  }, [tg]);

  const user = tg?.initDataUnsafe?.user;
  const userName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Lễ tân SMO'
    : 'Chủ SMO';

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    try {
      if (tg?.HapticFeedback) {
        if (style === 'selection') {
          tg.HapticFeedback.selectionChanged();
        } else {
          tg.HapticFeedback.impactOccurred(style);
        }
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        // Fallback browser vibration if available
        navigator.vibrate(style === 'heavy' ? 40 : 15);
      }
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }, [tg]);

  const triggerNotificationHaptic = useCallback((type: 'success' | 'warning' | 'error') => {
    try {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(type === 'error' ? [50, 50, 50] : [25, 25]);
      }
    } catch {
      // Ignore vibration errors
    }
  }, [tg]);

  return {
    tg,
    user,
    userName,
    isTelegram: Boolean(tg?.initData),
    triggerHaptic,
    triggerNotificationHaptic,
  };
}
