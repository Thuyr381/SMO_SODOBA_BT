// src/features/floorplan/hooks/useTableMap.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { gasApi } from '../../../services/gasApi';
import { TableStatusClass } from '../../../types';

export function useTableMap(selectedDate?: string) {
  const [statusMap, setStatusMap] = useState<Record<string, TableStatusClass>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const previousStatusMapRef = useRef<Record<string, TableStatusClass>>({});

  // 1. Fetch dữ liệu từ Google Sheets / Storage theo ngày đã chọn
  const syncStatus = useCallback(async () => {
    try {
      const data = await gasApi.getTableStatusMap(selectedDate);
      setStatusMap(data as Record<string, TableStatusClass>);
      previousStatusMapRef.current = data as Record<string, TableStatusClass>;
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Lỗi đồng bộ bảng trạng thái bàn:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // 2. Polling tự động mỗi 20 giây (Tắt khi tab inactive - Test Case 5)
  useEffect(() => {
    syncStatus();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncStatus();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [syncStatus]);

  // 3. OPTIMISTIC UPDATE: Cập nhật UI ngay lập tức (<50ms)
  const mutateTableStatusOptimistic = useCallback((
    tableIds: string[],
    newStatus: TableStatusClass | null
  ) => {
    // Save snapshot before mutating
    previousStatusMapRef.current = { ...statusMap };

    setStatusMap((prev) => {
      const nextMap = { ...prev };
      tableIds.forEach((id) => {
        const norm = id.replace(/^B0?/, '');
        const bCode = `B${('0' + norm).slice(-2)}`;
        if (newStatus === null || newStatus === 'empty') {
          delete nextMap[id];
          delete nextMap[norm];
          delete nextMap[bCode];
        } else {
          nextMap[id] = newStatus;
          nextMap[norm] = newStatus;
        }
      });
      return nextMap;
    });
  }, [statusMap]);

  // Rollback in case of server/network failure
  const rollbackStatus = useCallback(() => {
    setStatusMap(previousStatusMapRef.current);
  }, []);

  return {
    statusMap,
    isLoading,
    lastSyncTime,
    syncStatus,
    mutateTableStatusOptimistic,
    rollbackStatus,
  };
}
