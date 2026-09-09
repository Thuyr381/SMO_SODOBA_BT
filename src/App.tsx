// src/App.tsx
import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { INITIAL_TABLES } from './config/constants';
import { ActionMode, BookingPayload, OrderMenuItem, TableItem, TableStatusClass, ToastMessage } from './types';
import { useTableMap } from './features/floorplan/hooks/useTableMap';
import { useTelegram } from './hooks/useTelegram';
import { gasApi } from './services/gasApi';

import { HeaderBar } from './features/floorplan/components/HeaderBar';
import { ActionToolbar } from './features/floorplan/components/ActionToolbar';
import { FloorCanvas } from './features/floorplan/components/FloorCanvas';
import { BottomBarConfirm } from './features/floorplan/components/BottomBarConfirm';
import { BookingModal } from './features/booking/components/BookingModal';
import { EditBookingModal } from './features/booking/components/EditBookingModal';
import { TableDetailModal } from './features/floorplan/components/TableDetailModal';
import { MoveTableModal } from './features/floorplan/components/MoveTableModal';
import { LinkTableModal } from './features/floorplan/components/LinkTableModal';
import { KitchenSlipModal } from './features/floorplan/components/KitchenSlipModal';
import { GasAuthModal } from './features/settings/components/GasAuthModal';
import { ToastContainer } from './components/ui/ToastContainer';

const BookingListView = lazy(() =>
  import('./features/menu/BookingListView').then((module) => ({ default: module.BookingListView }))
);
const MenuDetailView = lazy(() =>
  import('./features/menu/MenuDetailView').then((module) => ({ default: module.MenuDetailView }))
);
const SettingsView = lazy(() =>
  import('./features/settings/SettingsView').then((module) => ({ default: module.SettingsView }))
);

export default function App() {
  const { userName, triggerHaptic, triggerNotificationHaptic } = useTelegram();

  // Navigation view
  const [currentView, setCurrentView] = useState<'floorplan' | 'bookings' | 'settings'>('floorplan');

  // Authentication for Sheet / GAS Tab (mật khẩu: smo_vungmanh)
  const [isGasUnlocked, setIsGasUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('smo_gas_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [isGasAuthModalOpen, setIsGasAuthModalOpen] = useState(false);

  // Selected date filter (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Floorplan interaction states
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  // Bookings list & Detail for menu management
  const [bookings, setBookings] = useState<BookingPayload[]>(() => gasApi.getCachedBookings(selectedDate));
  const handleBookingsSynced = useCallback((syncedBookings: BookingPayload[]) => {
    setBookings(syncedBookings);
  }, []);
  const { statusMap, isLoading, syncStatus, mutateTableStatusOptimistic, rollbackStatus } = useTableMap(
    selectedDate,
    handleBookingsSynced
  );
  const [activeBookingForMenu, setActiveBookingForMenu] = useState<BookingPayload | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Edit Booking Modal state (sửa thông tin khách & đổi bàn)
  const [editBooking, setEditBooking] = useState<BookingPayload | null>(null);

  // Table Detail Modal state (when clicked with actionMode === null)
  const [inspectTable, setInspectTable] = useState<{
    table: TableItem;
    status: TableStatusClass;
    booking: BookingPayload | null;
    orderItems: OrderMenuItem[];
    isOrderItemsLoading: boolean;
  } | null>(null);

  // Move Table (Group Transfer - Kịch bản 1) state
  const [moveTableState, setMoveTableState] = useState<{
    isOpen: boolean;
    booking: BookingPayload | null;
    sourceTableId: string;
  }>({
    isOpen: false,
    booking: null,
    sourceTableId: '',
  });

  // Link Table (Table Linking - Kịch bản 2) state
  const [linkTableState, setLinkTableState] = useState<{
    isOpen: boolean;
    booking: BookingPayload | null;
    currentTableId: string;
  }>({
    isOpen: false,
    booking: null,
    currentTableId: '',
  });

  // Kitchen Slip Notification Modal state
  const [kitchenSlipState, setKitchenSlipState] = useState<{
    isOpen: boolean;
    oldTables: string[];
    newTables: string[];
    booking: BookingPayload | null;
    orderItems: OrderMenuItem[];
  }>({
    isOpen: false,
    oldTables: [],
    newTables: [],
    booking: null,
    orderItems: [],
  });

  // Custom Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { id, title, message, type, timestamp: Date.now() };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all bookings
  const loadBookings = useCallback(async (forceRefresh = false) => {
    try {
      const list = await gasApi.getAllBookings(selectedDate, forceRefresh);
      setBookings(list);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách đặt bàn:', err);
    }
  }, [selectedDate]);

  const refreshBookingsFromCache = useCallback(() => {
    setBookings(gasApi.getCachedBookings(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    // Đổi ngày hiển thị cache ngay; useTableMap sẽ dùng cùng một GET để làm mới cả bàn và đơn.
    refreshBookingsFromCache();
  }, [refreshBookingsFromCache]);

  // Handle Mode Selection in Toolbar
  const handleSelectMode = (mode: ActionMode) => {
    if (actionMode === mode) {
      // Toggle off -> Default mode
      setActionMode(null);
    } else {
      setActionMode(mode);
    }
    // Rule: Khi chọn mode mới, tự động xóa danh sách bàn đang chọn dở
    setSelectedTables(new Set());
    triggerHaptic('selection');
  };

  // Handle Table Click:
  // If actionMode === null -> Open Table Detail Modal with Customer Representative
  // If in an Action Mode (CONFIRM, ARRIVE, CANCEL, BOOK, etc.) -> Synchronize multi-table selection for bookings with >= 2 tables (except LOCK)
  const handleToggleTable = useCallback(async (tableId: string) => {
    triggerHaptic('light');

    // Case 1: actionMode === null -> Display table details & representative customer information
    if (actionMode === null) {
      const targetTable = INITIAL_TABLES.find((t) => t.id === tableId);
      if (!targetTable) return;

      const currentStatus = statusMap[tableId] || targetTable.status || 'empty';
      const matchedBooking = bookings.find(
        (b) => b.trang_thai !== 'HỦY' && b.danh_sach_ban && b.danh_sach_ban.includes(tableId)
      ) || null;

      setInspectTable({
        table: targetTable,
        status: currentStatus,
        booking: matchedBooking,
        orderItems: matchedBooking?.id_dat ? gasApi.getCachedOrderMenus(matchedBooking.id_dat) : [],
        isOrderItemsLoading: Boolean(matchedBooking?.id_dat),
      });

      if (matchedBooking?.id_dat) {
        const bookingId = matchedBooking.id_dat;
        void gasApi.getOrderMenus(bookingId).then((orderItems) => {
          setInspectTable((current) =>
            current?.booking?.id_dat === bookingId
              ? { ...current, orderItems, isOrderItemsLoading: false }
              : current
          );
        }).catch((error) => {
          console.error('Lỗi lấy món ăn:', error);
          setInspectTable((current) =>
            current?.booking?.id_dat === bookingId
              ? { ...current, isOrderItemsLoading: false }
              : current
          );
        });
      }
      return;
    }

    // Case 2: In Action Mode (except LOCK)
    // Kiểm tra điều kiện cho chức năng ĐÃ VỀ: Bàn phải đang ở trạng thái ĐÃ ĐẾN
    if (actionMode === 'LEAVE') {
      const currentStatus = statusMap[tableId] || 'empty';
      if (currentStatus !== 'arrived') {
        showToast(
          'Không hợp lệ',
          `Bàn ${tableId} chưa ở trạng thái ĐÃ ĐẾN. Chỉ bàn đang ĐÃ ĐẾN mới được sử dụng chức năng ĐÃ VỀ!`,
          'warning'
        );
        return;
      }
    }

    // Synchronize multi-table selection for customers with >= 2 tables
    if (actionMode !== 'LOCK') {
      const matchedBooking = bookings.find(
        (b) => b.trang_thai !== 'HỦY' && b.danh_sach_ban && b.danh_sach_ban.includes(tableId)
      );

      if (matchedBooking && matchedBooking.danh_sach_ban && matchedBooking.danh_sach_ban.length > 1) {
        const groupTables = matchedBooking.danh_sach_ban;
        const isAlreadySelected = groupTables.some((t) => selectedTables.has(t));

        setSelectedTables((prev) => {
          const next = new Set(prev);
          if (isAlreadySelected) {
            groupTables.forEach((t) => next.delete(t));
          } else {
            groupTables.forEach((t) => next.add(t));
          }
          return next;
        });

        showToast(
          'Đồng bộ nhóm bàn',
          `${isAlreadySelected ? 'Bỏ chọn' : 'Đã chọn'} toàn bộ nhóm bàn [${groupTables.join(', ')}] của khách ${matchedBooking.ten_khach}`,
          'info'
        );
        return;
      }
    }

    // Standard single/multi table toggle
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  }, [actionMode, bookings, selectedTables, showToast, statusMap, triggerHaptic]);

  // Inspect booking directly from Search Bar autocomplete
  const handleInspectBooking = useCallback(async (booking: BookingPayload) => {
    if (!booking.danh_sach_ban || booking.danh_sach_ban.length === 0) return;
    const tableId = booking.danh_sach_ban[0];
    const targetTable = INITIAL_TABLES.find((t) => t.id === tableId) || {
      id: tableId,
      name: `Bàn ${tableId}`,
      capacity: 4,
      zone: 'GROUND',
      status: 'booked' as TableStatusClass,
    };

    setInspectTable({
      table: targetTable,
      status: statusMap[tableId] || 'booked',
      booking,
      orderItems: booking.id_dat ? gasApi.getCachedOrderMenus(booking.id_dat) : [],
      isOrderItemsLoading: Boolean(booking.id_dat),
    });

    if (booking.id_dat) {
      const bookingId = booking.id_dat;
      void gasApi.getOrderMenus(bookingId).then((orderItems) => {
        setInspectTable((current) =>
          current?.booking?.id_dat === bookingId
            ? { ...current, orderItems, isOrderItemsLoading: false }
            : current
        );
      }).catch((error) => {
        console.error('Lỗi lấy món ăn:', error);
        setInspectTable((current) =>
          current?.booking?.id_dat === bookingId
            ? { ...current, isOrderItemsLoading: false }
            : current
        );
      });
    }
  }, [statusMap]);

  // Clear Selection
  const handleClearSelection = () => {
    setSelectedTables(new Set());
    triggerHaptic('light');
  };

  // Track whether an action is currently syncing to GAS
  const [isActionExecuting, setIsActionExecuting] = useState(false);

  // Execute Action from Bottom Bar (Resets to Default Mode after action immediately)
  const handleExecuteBottomAction = async () => {
    const tableIds = Array.from(selectedTables);
    if (tableIds.length === 0 || isActionExecuting) return;

    if (actionMode === 'BOOK') {
      // Open Booking form modal
      setIsBookingModalOpen(true);
      return;
    }

    // Debounce rapid multiple taps (250ms guard only, doesn't lock user for 3-5s)
    setIsActionExecuting(true);
    setTimeout(() => setIsActionExecuting(false), 250);

    if (actionMode === 'CONFIRM') {
      // Optimistic UI update (<50ms)
      mutateTableStatusOptimistic(tableIds, 'confirmed');
      triggerNotificationHaptic('success');
      showToast('Đã xác nhận đơn', `Bàn ${tableIds.join(', ')} đã chuyển sang trạng thái ĐÃ XÁC NHẬN`, 'success');
      
      // Return to Default mode immediately
      setActionMode(null);
      setSelectedTables(new Set());

      gasApi.sendAction({
        action: 'UPDATE_STATUS',
        danh_sach_ban: tableIds,
        trang_thai: 'ĐÃ XÁC NHẬN',
        ngay_dat: selectedDate,
      }).then(() => {
        refreshBookingsFromCache();
      }).catch((err) => {
        console.error('Lỗi khi xác nhận bàn:', err);
        rollbackStatus();
        showToast('Lỗi đồng bộ', 'Không thể kết nối máy chủ, đã hoàn tác', 'error');
      });
      return;
    }

    if (actionMode === 'ARRIVE') {
      // Optimistic UI update (<50ms)
      mutateTableStatusOptimistic(tableIds, 'arrived');
      triggerNotificationHaptic('success');
      showToast('Khách đã đến', `Bàn ${tableIds.join(', ')} đã chuyển sang trạng thái ĐÃ ĐẾN`, 'success');
      
      // Return to Default mode immediately
      setActionMode(null);
      setSelectedTables(new Set());

      gasApi.sendAction({
        action: 'UPDATE_STATUS',
        danh_sach_ban: tableIds,
        trang_thai: 'ĐÃ ĐẾN',
        ngay_dat: selectedDate,
      }).then(() => {
        refreshBookingsFromCache();
      }).catch((err) => {
        console.error('Lỗi khi cập nhật khách đã đến:', err);
        rollbackStatus();
        showToast('Lỗi đồng bộ', 'Không thể kết nối máy chủ, đã hoàn tác', 'error');
      });
      return;
    }

    if (actionMode === 'LEAVE') {
      // Chức năng ĐÃ VỀ: Điều kiện Bàn đang có trạng thái ĐÃ ĐẾN, sau đó trả lại Bàn trống
      mutateTableStatusOptimistic(tableIds, 'empty');
      triggerNotificationHaptic('success');
      showToast('Khách đã về', `Bàn ${tableIds.join(', ')} đã chuyển sang trạng thái ĐÃ VỀ và trả lại BÀN TRỐNG`, 'success');
      
      // Return to Default mode immediately
      setActionMode(null);
      setSelectedTables(new Set());

      gasApi.sendAction({
        action: 'UPDATE_STATUS',
        danh_sach_ban: tableIds,
        trang_thai: 'ĐÃ VỀ',
        ngay_dat: selectedDate,
      }).then(() => {
        refreshBookingsFromCache();
      }).catch((err) => {
        console.error('Lỗi khi cập nhật khách đã về:', err);
        rollbackStatus();
        showToast('Lỗi đồng bộ', 'Không thể kết nối máy chủ, đã hoàn tác', 'error');
      });
      return;
    }

    if (actionMode === 'CANCEL') {
      // Optimistic UI update (<50ms)
      mutateTableStatusOptimistic(tableIds, 'empty');
      triggerNotificationHaptic('warning');
      showToast('Hủy đặt bàn', `Bàn ${tableIds.join(', ')} đã chuyển về trạng thái TRỐNG`, 'warning');
      
      // Return to Default mode immediately
      setActionMode(null);
      setSelectedTables(new Set());

      gasApi.sendAction({
        action: 'UPDATE_STATUS',
        danh_sach_ban: tableIds,
        trang_thai: 'HỦY',
        ngay_dat: selectedDate,
      }).then(() => {
        refreshBookingsFromCache();
      }).catch((err) => {
        console.error('Lỗi khi hủy đặt bàn:', err);
        rollbackStatus();
        showToast('Lỗi đồng bộ', 'Không thể kết nối máy chủ, đã hoàn tác', 'error');
      });
      return;
    }

    if (actionMode === 'LOCK') {
      // Determine new status for tables (toggle)
      const isCurrentlyInactive = tableIds.some((id) => statusMap[id] === 'inactive');
      const targetStatus: TableStatusClass = isCurrentlyInactive ? 'empty' : 'inactive';

      // Optimistic UI update tức thì (<50ms)
      mutateTableStatusOptimistic(tableIds, targetStatus);
      triggerNotificationHaptic(isCurrentlyInactive ? 'success' : 'warning');
      showToast(
        isCurrentlyInactive ? 'Mở khóa bàn' : 'Khóa bàn',
        `Bàn ${tableIds.join(', ')} đã ${isCurrentlyInactive ? 'mở khóa thành TRỐNG (Màu vàng)' : 'khóa tạm thời'}`,
        'info'
      );
      
      // Return to Default mode immediately
      setActionMode(null);
      setSelectedTables(new Set());

      gasApi.sendAction({
        action: isCurrentlyInactive ? 'UPDATE_STATUS' : 'LOCK',
        danh_sach_ban: tableIds,
        trang_thai: isCurrentlyInactive ? 'HỦY' : undefined,
        nguoi_nhap: userName,
        unlock: isCurrentlyInactive,
        ngay_dat: selectedDate,
      }).then(() => {
        refreshBookingsFromCache();
      }).catch((err) => {
        console.error('Lỗi khi khóa/mở bàn:', err);
        rollbackStatus();
        showToast('Lỗi đồng bộ', 'Không thể kết nối máy chủ, đã hoàn tác', 'error');
      });
    }
  };

  // Submit Booking Form (Resets to Default Mode after action immediately)
  const handleBookingSubmit = async (payload: BookingPayload) => {
    const tableIds = payload.danh_sach_ban;

    // 1. Optimistic UI update (<50ms): Chuyển bàn sang màu booked ngay lập tức
    mutateTableStatusOptimistic(tableIds, 'booked');
    triggerNotificationHaptic('success');
    
    // Close modal & return to Default mode immediately
    setIsBookingModalOpen(false);
    setActionMode(null);
    setSelectedTables(new Set());

    showToast(
      'Đã ghi nhận đặt bàn!',
      `Đơn cho khách ${payload.ten_khach} (${tableIds.join(', ')}). Đang lưu vào hệ thống...`,
      'info'
    );

    gasApi.sendAction<BookingPayload>({
      action: 'BOOK',
      ...payload,
    }).then((res) => {
      showToast(
        'Đặt bàn thành công!',
        `Đã lưu đơn ${res.data?.id_dat || 'S8'} cho khách ${payload.ten_khach} (${tableIds.join(', ')})`,
        'success'
      );
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khi lưu đơn đặt bàn:', err);
      rollbackStatus();
      showToast('Lỗi đặt bàn', 'Không thể lưu đơn vào hệ thống, đã hoàn tác', 'error');
    });
  };

  // Save Updated Booking (Sửa thông tin khách & đổi bàn)
  const handleSaveUpdatedBooking = async (updatedBooking: BookingPayload) => {
    const oldBooking = bookings.find((b) => b.id_dat === updatedBooking.id_dat);
    const oldTables = oldBooking?.danh_sach_ban || [];
    const newTables = updatedBooking.danh_sach_ban || [];

    let targetStatusClass: TableStatusClass = 'booked';
    if (updatedBooking.trang_thai === 'ĐÃ XÁC NHẬN') targetStatusClass = 'confirmed';
    else if (updatedBooking.trang_thai === 'ĐÃ ĐẾN') targetStatusClass = 'arrived';
    else if (updatedBooking.trang_thai === 'HỦY') targetStatusClass = 'empty';

    // Free removed tables
    const removedTables = oldTables.filter((t) => !newTables.includes(t));
    if (removedTables.length > 0) {
      mutateTableStatusOptimistic(removedTables, 'empty');
    }
    if (updatedBooking.trang_thai !== 'HỦY') {
      mutateTableStatusOptimistic(newTables, targetStatusClass);
    } else {
      mutateTableStatusOptimistic(newTables, 'empty');
    }

    triggerNotificationHaptic('success');
    setActionMode(null);
    setSelectedTables(new Set());
    setEditBooking(null);

    showToast(
      'Cập nhật thành công!',
      `Đã cập nhật đơn ${updatedBooking.id_dat} (Khách: ${updatedBooking.ten_khach}, Bàn: [${newTables.join(', ')}])`,
      'success'
    );

    gasApi.updateBooking(updatedBooking).then(() => {
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khi cập nhật đơn đặt bàn:', err);
      rollbackStatus();
      showToast('Lỗi cập nhật', 'Không thể lưu thay đổi vào hệ thống, đã hoàn tác', 'error');
    });
  };

  // Execute Move Table (Group Transfer - Kịch bản 1) (Resets to Default Mode after action)
  const handleConfirmMoveTable = async (payload: {
    booking: BookingPayload;
    oldTables: string[];
    newTables: string[];
    printTicket: boolean;
  }) => {
    const { booking, oldTables, newTables } = payload;
    const idDat = booking.id_dat || '';

    // 1. Optimistic update (<50ms)
    mutateTableStatusOptimistic(oldTables, 'empty');
    mutateTableStatusOptimistic(newTables, 'booked');
    triggerNotificationHaptic('success');

    // Return to Default mode immediately
    setActionMode(null);
    setSelectedTables(new Set());
    setMoveTableState({ isOpen: false, booking: null, sourceTableId: '' });

    showToast(
      'Dời bàn thành công!',
      `Đã dời từ [${oldTables.join(', ')}] sang [${newTables.join(', ')}]`,
      'success'
    );

    // Load updated order items & booking for kitchen ticket
    const updatedBooking = bookings.find((b) => b.id_dat === idDat) || null;
    let orderItems: OrderMenuItem[] = [];
    if (idDat) {
      try {
        orderItems = gasApi.getCachedOrderMenus(idDat);
      } catch (e) {
        console.error(e);
      }
    }

    // Pop up the Kitchen Slip Modal immediately
    setKitchenSlipState({
      isOpen: true,
      oldTables,
      newTables,
      booking: updatedBooking ? { ...updatedBooking, danh_sach_ban: newTables } : { ...booking, danh_sach_ban: newTables },
      orderItems,
    });

    gasApi.sendAction({
      action: 'MOVE_TABLE',
      id_dat: idDat,
      old_tables: oldTables,
      new_tables: newTables,
    }).then(() => {
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khi dời bàn:', err);
      rollbackStatus();
      showToast('Lỗi dời bàn', 'Không thể thực hiện dời bàn trên hệ thống', 'error');
    });
  };

  // Execute Link Table (Table Linking - Kịch bản 2) (Resets to Default Mode after action)
  const handleConfirmLinkTable = async (idDat: string, addedTables: string[]) => {
    mutateTableStatusOptimistic(addedTables, 'booked');
    triggerNotificationHaptic('success');

    // Return to Default mode immediately
    setActionMode(null);
    setSelectedTables(new Set());
    setLinkTableState({ isOpen: false, booking: null, currentTableId: '' });

    showToast(
      'Gộp/Nối bàn thành công!',
      `Đã nối thêm bàn [${addedTables.join(', ')}] vào đơn ${idDat}`,
      'success'
    );

    gasApi.sendAction({
      action: 'LINK_TABLE',
      id_dat: idDat,
      added_tables: addedTables,
    }).then(() => {
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khi nối thêm bàn:', err);
      rollbackStatus();
      showToast('Lỗi', 'Không thể gộp bàn', 'error');
    });
  };

  // Update status from Booking List View or Table Detail Modal (Resets to Default Mode after action)
  const handleUpdateBookingStatus = async (
    booking: BookingPayload,
    newStatus: 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'ĐÃ VỀ' | 'HỦY'
  ) => {
    let targetMapStatus: TableStatusClass = 'empty';
    if (newStatus === 'ĐÃ XÁC NHẬN') targetMapStatus = 'confirmed';
    if (newStatus === 'ĐÃ ĐẾN') targetMapStatus = 'arrived';
    if (newStatus === 'ĐÃ VỀ') targetMapStatus = 'empty'; // Trả lại bàn trống
    if (newStatus === 'HỦY') targetMapStatus = 'empty';

    mutateTableStatusOptimistic(booking.danh_sach_ban, targetMapStatus);
    triggerNotificationHaptic('success');
    showToast(
      newStatus === 'ĐÃ VỀ' ? 'Khách đã về' : 'Cập nhật trạng thái',
      newStatus === 'ĐÃ VỀ'
        ? `Bàn [${booking.danh_sach_ban?.join(', ')}] đã chuyển sang ĐÃ VỀ và trả lại BÀN TRỐNG`
        : `Đơn ${booking.id_dat} chuyển sang ${newStatus}`,
      'success'
    );

    // Return to Default mode immediately
    setActionMode(null);
    setSelectedTables(new Set());
    if (inspectTable) {
      setInspectTable(null);
    }

    gasApi.sendAction({
      action: 'UPDATE_STATUS',
      danh_sach_ban: booking.danh_sach_ban,
      trang_thai: newStatus,
      ngay_dat: booking.ngay_dat,
    }).then(() => {
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      rollbackStatus();
      showToast('Lỗi', 'Không thể cập nhật trạng thái đơn', 'error');
    });
  };

  // Toggle Lock from Table Detail Modal
  const handleToggleLockSingleTable = async (tableId: string) => {
    const isCurrentlyInactive = statusMap[tableId] === 'inactive';
    const targetStatus: TableStatusClass = isCurrentlyInactive ? 'empty' : 'inactive';

    mutateTableStatusOptimistic([tableId], targetStatus);
    triggerNotificationHaptic(isCurrentlyInactive ? 'success' : 'warning');
    showToast(
      isCurrentlyInactive ? 'Mở khóa bàn' : 'Khóa bàn',
      `Bàn ${tableId} đã ${isCurrentlyInactive ? 'mở khóa thành TRỐNG' : 'khóa tạm thời'}`,
      'info'
    );

    // Return to Default mode immediately
    setActionMode(null);
    setSelectedTables(new Set());

    gasApi.sendAction({
      action: 'LOCK',
      danh_sach_ban: [tableId],
      nguoi_nhap: userName,
      unlock: isCurrentlyInactive,
      ngay_dat: selectedDate,
    }).then(() => {
      refreshBookingsFromCache();
    }).catch((err) => {
      console.error('Lỗi khóa bàn:', err);
      rollbackStatus();
      showToast('Lỗi', 'Không thể khóa/mở khóa bàn', 'error');
    });
  };

  // Open Menu Detail View for a booking
  const handleOpenMenuDetail = (booking: BookingPayload) => {
    setActiveBookingForMenu(booking);
    setCurrentView('bookings');
  };

  const handleRefreshAll = () => {
    void syncStatus(true);
  };

  // Handle view navigation with password protection for Sheet / GAS tab (smo_vungmanh)
  const handleNavigateView = (v: 'floorplan' | 'bookings' | 'settings') => {
    if (v === 'settings') {
      if (isGasUnlocked) {
        setCurrentView('settings');
      } else {
        setIsGasAuthModalOpen(true);
      }
      return;
    }

    setCurrentView(v);
    if (v === 'floorplan') setActiveBookingForMenu(null);
  };

  const handleGasAuthSuccess = () => {
    setIsGasUnlocked(true);
    try {
      sessionStorage.setItem('smo_gas_unlocked', 'true');
    } catch {}
    setIsGasAuthModalOpen(false);
    setCurrentView('settings');
    triggerNotificationHaptic('success');
    showToast('Xác thực thành công', 'Đã mở khóa truy cập Tab Sheet / GAS', 'success');
  };

  const handleLockGasTab = () => {
    setIsGasUnlocked(false);
    try {
      sessionStorage.removeItem('smo_gas_unlocked');
    } catch {}
    setCurrentView('floorplan');
    triggerHaptic();
    showToast('Đã khóa Tab', 'Đã khóa quyền truy cập Tab Sheet / GAS', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Toast Alert Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header Bar with Legend & Navigation Tabs */}
      <HeaderBar
        tables={INITIAL_TABLES}
        statusMap={statusMap}
        isLoading={isLoading}
        onRefresh={handleRefreshAll}
        currentView={currentView}
        onChangeView={handleNavigateView}
        bookingCount={bookings.filter((b) => b.trang_thai !== 'HỦY').length}
        selectedDate={selectedDate}
        onChangeDate={(d) => {
          setSelectedDate(d);
          showToast('Đổi ngày xem', `Đang xem sơ đồ ngày ${d}`, 'info');
        }}
        isGasUnlocked={isGasUnlocked}
      />

      {/* Action Toolbar - Shown when in Floorplan view */}
      {currentView === 'floorplan' && (
        <ActionToolbar currentMode={actionMode} onSelectMode={handleSelectMode} />
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-1 py-0.5 sm:px-3 sm:py-1 transition-all ${
          currentView === 'floorplan'
            ? selectedTables.size > 0
              ? 'pb-20'
              : 'pb-1 overflow-hidden'
            : 'pb-24'
        }`}
      >
        {currentView === 'floorplan' && (
          <FloorCanvas
            tables={INITIAL_TABLES}
            statusMap={statusMap}
            selectedTables={selectedTables}
            actionMode={actionMode}
            bookings={bookings}
            onToggleTable={handleToggleTable}
            onInspectBooking={handleInspectBooking}
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
          />
        )}

        <Suspense fallback={<div className="py-16 text-center text-sm text-slate-400">Đang mở chức năng...</div>}>
          {currentView === 'bookings' && !activeBookingForMenu && (
            <BookingListView
              bookings={bookings}
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
              onRefreshBookings={loadBookings}
              onOpenMenuDetail={handleOpenMenuDetail}
              onUpdateStatus={handleUpdateBookingStatus}
              onOpenEditBooking={(b) => setEditBooking(b)}
              onNewBookingClick={() => {
                setCurrentView('floorplan');
                setActionMode('BOOK');
                showToast('Đặt bàn', 'Hãy chọn các bàn đang trống trên sơ đồ rồi bấm Tiếp tục đặt bàn', 'info');
              }}
            />
          )}

          {currentView === 'bookings' && activeBookingForMenu && (
            <MenuDetailView
              booking={activeBookingForMenu}
              onBack={() => setActiveBookingForMenu(null)}
              onShowToast={showToast}
            />
          )}

          {currentView === 'settings' && isGasUnlocked && (
            <SettingsView
              onShowToast={showToast}
              onRefreshAll={handleRefreshAll}
              onLock={handleLockGasTab}
            />
          )}
        </Suspense>
      </main>

      {/* Bottom Bar Confirmation */}
      {currentView === 'floorplan' && (
        <BottomBarConfirm
          selectedTableIds={Array.from(selectedTables)}
          actionMode={actionMode}
          statusMap={statusMap}
          isExecuting={isActionExecuting}
          onExecuteAction={handleExecuteBottomAction}
          onClearSelection={handleClearSelection}
        />
      )}

      {/* 1. Modal Form Đặt Bàn Mới */}
      <BookingModal
        isOpen={isBookingModalOpen}
        selectedTableIds={Array.from(selectedTables)}
        currentUserName={userName}
        onClose={() => setIsBookingModalOpen(false)}
        onSubmit={handleBookingSubmit}
      />

      {/* 2. Modal Sửa Thông Tin Khách & Đổi Bàn (Sửa được mọi thông tin) */}
      <EditBookingModal
        isOpen={Boolean(editBooking)}
        booking={editBooking}
        tables={INITIAL_TABLES}
        statusMap={statusMap}
        bookings={bookings}
        onClose={() => setEditBooking(null)}
        onSave={handleSaveUpdatedBooking}
      />

      {/* 3. Modal Chi tiết Bàn & Thông tin Người đại diện (khi click bàn lúc chưa chọn chức năng) */}
      <TableDetailModal
        isOpen={Boolean(inspectTable)}
        table={inspectTable?.table || null}
        status={inspectTable?.status || 'empty'}
        booking={inspectTable?.booking || null}
        orderItems={inspectTable?.orderItems || []}
        isOrderItemsLoading={inspectTable?.isOrderItemsLoading || false}
        onClose={() => setInspectTable(null)}
        onOpenBookingModal={(tableId) => {
          setSelectedTables(new Set([tableId]));
          setIsBookingModalOpen(true);
        }}
        onOpenEditBooking={(b) => setEditBooking(b)}
        onOpenMoveModal={(booking, tableId) => {
          setMoveTableState({
            isOpen: true,
            booking,
            sourceTableId: tableId,
          });
        }}
        onOpenLinkModal={(booking, tableId) => {
          setLinkTableState({
            isOpen: true,
            booking,
            currentTableId: tableId,
          });
        }}
        onOpenMenuDetail={handleOpenMenuDetail}
        onUpdateStatus={handleUpdateBookingStatus}
        onToggleLock={handleToggleLockSingleTable}
      />

      {/* 4. Modal Dời Bàn (Group Transfer - Kịch bản 1) */}
      {moveTableState.isOpen && moveTableState.booking && (
        <MoveTableModal
          isOpen={moveTableState.isOpen}
          booking={moveTableState.booking}
          sourceTableId={moveTableState.sourceTableId}
          tables={INITIAL_TABLES}
          statusMap={statusMap}
          onClose={() => setMoveTableState({ isOpen: false, booking: null, sourceTableId: '' })}
          onConfirmMove={handleConfirmMoveTable}
        />
      )}

      {/* 5. Modal Gộp / Nối Bàn (Table Linking - Kịch bản 2) */}
      {linkTableState.isOpen && linkTableState.booking && (
        <LinkTableModal
          isOpen={linkTableState.isOpen}
          booking={linkTableState.booking}
          currentTableId={linkTableState.currentTableId}
          tables={INITIAL_TABLES}
          statusMap={statusMap}
          onClose={() => setLinkTableState({ isOpen: false, booking: null, currentTableId: '' })}
          onConfirmLink={handleConfirmLinkTable}
        />
      )}

      {/* 6. Modal In Phiếu Báo Dời Bàn Bếp/Bar */}
      <KitchenSlipModal
        isOpen={kitchenSlipState.isOpen}
        oldTables={kitchenSlipState.oldTables}
        newTables={kitchenSlipState.newTables}
        booking={kitchenSlipState.booking}
        orderItems={kitchenSlipState.orderItems}
        onClose={() =>
          setKitchenSlipState({
            isOpen: false,
            oldTables: [],
            newTables: [],
            booking: null,
            orderItems: [],
          })
        }
      />

      {/* 7. Modal Yêu Cầu Mật Khẩu Tab Sheet / GAS (smo_vungmanh) */}
      <GasAuthModal
        isOpen={isGasAuthModalOpen}
        onClose={() => setIsGasAuthModalOpen(false)}
        onSuccess={handleGasAuthSuccess}
      />
    </div>
  );
}
