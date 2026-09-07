// src/services/gasApi.ts
import { API_DATBAN_URL, INITIAL_TABLES, INITIAL_MENU_ITEMS } from '../config/constants';
import { BookingPayload, MasterMenuItem, OrderMenuItem, TableStatusClass } from '../types';
import { generateBookingId, generateMenuItemId, getTodayDateString, getCurrentTimeString } from '../utils/formatters';
import {
  normalizeTableId,
  parseTableList,
  normalizeDateString,
  mapTrangThaiToTableStatus,
  formatTableStandardCode,
  formatTableListDisplay,
  isDateMatching,
} from '../utils/tableHelper';

const STORAGE_KEY_TABLES = 'sodoba_config_ban_v1';
const STORAGE_KEY_BOOKINGS = 'sodoba_datban_v1';
const STORAGE_KEY_ORDER_MENUS = 'sodoba_datmon_v1';
const STORAGE_KEY_MASTER_MENUS = 'sodoba_config_mon_v1';
const STORAGE_KEY_CUSTOM_GAS_URL = 'sodoba_custom_gas_url';

interface LocalDatabase {
  tableStatusMap: Record<string, TableStatusClass>;
  bookings: BookingPayload[];
  orderMenus: OrderMenuItem[];
  masterMenus: MasterMenuItem[];
}

function initializeLocalStorage(): LocalDatabase {
  if (typeof window === 'undefined') {
    return {
      tableStatusMap: {},
      bookings: [],
      orderMenus: [],
      masterMenus: INITIAL_MENU_ITEMS,
    };
  }

  // Load or initialize Table Status Map
  let tableStatusMap: Record<string, TableStatusClass> = {};
  const storedTables = localStorage.getItem(STORAGE_KEY_TABLES);
  if (storedTables) {
    try {
      tableStatusMap = JSON.parse(storedTables);
    } catch {
      tableStatusMap = {};
    }
  } else {
    // Initial sample states
    tableStatusMap = {
      '56': 'booked',
      '57': 'booked',
      '10': 'empty',
      'VIP70': 'confirmed',
      '44': 'arrived',
      '12': 'inactive',
    };
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(tableStatusMap));
  }

  // Load or initialize Bookings (DATBAN)
  let bookings: BookingPayload[] = [];
  const storedBookings = localStorage.getItem(STORAGE_KEY_BOOKINGS);
  if (storedBookings) {
    try {
      bookings = JSON.parse(storedBookings);
    } catch {
      bookings = [];
    }
  } else {
    const today = getTodayDateString();
    bookings = [
      {
        id_dat: 'S8-20260831-001',
        ngay_dat: today,
        gio_dat: '18:00',
        ten_khach: 'Nguyễn Văn A',
        sdt: '0901234567',
        so_khach: 4,
        tien_coc: 200000,
        ghi_chu: 'Ghế trẻ em, gần khu cây xanh',
        danh_sach_ban: ['56', '57'],
        nguoi_nhap: 'Chủ SMO',
        trang_thai: 'ĐÃ ĐẶT',
        created_at: new Date().toISOString(),
      },
      {
        id_dat: 'S8-20260831-002',
        ngay_dat: today,
        gio_dat: '19:00',
        ten_khach: 'Trần Thị Mai',
        sdt: '0987654321',
        so_khach: 10,
        tien_coc: 500000,
        ghi_chu: 'Phòng riêng máy lạnh tiếp khách VIP',
        danh_sach_ban: ['VIP70'],
        nguoi_nhap: 'Lễ tân SMO',
        trang_thai: 'ĐÃ XÁC NHẬN',
        created_at: new Date().toISOString(),
      },
      {
        id_dat: 'S8-20260831-003',
        ngay_dat: today,
        gio_dat: '12:30',
        ten_khach: 'Lê Hoàng Nam',
        sdt: '0918273645',
        so_khach: 6,
        tien_coc: 0,
        ghi_chu: 'Ăn trưa nhanh',
        danh_sach_ban: ['44'],
        nguoi_nhap: 'Chủ SMO',
        trang_thai: 'ĐÃ ĐẾN',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  }

  // Load or initialize Master Menus (CONFIG_MON)
  let masterMenus: MasterMenuItem[] = INITIAL_MENU_ITEMS;
  const storedMasterMenus = localStorage.getItem(STORAGE_KEY_MASTER_MENUS);
  if (storedMasterMenus) {
    try {
      masterMenus = JSON.parse(storedMasterMenus);
    } catch {
      masterMenus = INITIAL_MENU_ITEMS;
    }
  } else {
    localStorage.setItem(STORAGE_KEY_MASTER_MENUS, JSON.stringify(masterMenus));
  }

  // Load or initialize Order Menus (DATMON)
  let orderMenus: OrderMenuItem[] = [];
  const storedOrderMenus = localStorage.getItem(STORAGE_KEY_ORDER_MENUS);
  if (storedOrderMenus) {
    try {
      orderMenus = JSON.parse(storedOrderMenus);
    } catch {
      orderMenus = [];
    }
  } else {
    orderMenus = [
      {
        id_mon: 'S8-20260831-001-M01',
        id_dat: 'S8-20260831-001',
        ten_mon: 'Gỏi khoai môn hải sản',
        so_luong: 2,
        don_gia: 165000,
        ghi_chu: 'Ít ớt',
        trang_thai_mon: 'ACTIVE',
      },
      {
        id_mon: 'S8-20260831-001-M02',
        id_dat: 'S8-20260831-001',
        ten_mon: 'Lẩu thái hải sản chua cay',
        so_luong: 1,
        don_gia: 320000,
        ghi_chu: 'Nước dùng chua vừa',
        trang_thai_mon: 'ACTIVE',
      },
      {
        id_mon: 'S8-20260831-002-M01',
        id_dat: 'S8-20260831-002',
        ten_mon: 'Bò nướng tảng sốt tiêu xanh',
        so_luong: 2,
        don_gia: 280000,
        trang_thai_mon: 'ACTIVE',
      },
    ];
    localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(orderMenus));
  }

  return { tableStatusMap, bookings, orderMenus, masterMenus };
}

class GasApiService {
  private apiUrl: string = API_DATBAN_URL;

  constructor() {
    if (typeof window !== 'undefined') {
      const customUrl = localStorage.getItem(STORAGE_KEY_CUSTOM_GAS_URL);
      if (customUrl) {
        this.apiUrl = customUrl;
      }
    }
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public setApiUrl(url: string) {
    this.apiUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_GAS_URL, this.apiUrl);
    }
  }

  public isUsingRealGas(): boolean {
    return Boolean(this.apiUrl && !this.apiUrl.includes('MOCK_SODOBA_S8') && this.apiUrl.startsWith('https://script.google.com'));
  }

  /**
   * 1. GET: Lấy bản đồ trạng thái bàn từ CONFIG_BAN / DATBAN
   */
  async getTableStatusMap(selectedDate?: string): Promise<Record<string, TableStatusClass>> {
    if (this.isUsingRealGas()) {
      try {
        const queryParam = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
        const response = await fetch(`${this.apiUrl}${queryParam}`, { method: 'GET' });
        if (!response.ok) throw new Error('Network error fetching status');
        const rawData = await response.json();

        let rawMap: Record<string, any> = {};
        if (rawData.statusMap && typeof rawData.statusMap === 'object') {
          rawMap = rawData.statusMap;
        } else if (rawData.tableStatusMap && typeof rawData.tableStatusMap === 'object') {
          rawMap = rawData.tableStatusMap;
        } else if (rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)) {
          rawMap = rawData.data;
        } else if (typeof rawData === 'object' && !Array.isArray(rawData)) {
          rawMap = rawData;
        }

        // Đồng bộ danh sách đặt bàn nếu GAS trả về kèm bookings hoặc detailsMap
        let bookingList: any[] = [];
        if (Array.isArray(rawData.bookings)) {
          bookingList = rawData.bookings;
        } else if (rawData.detailsMap && typeof rawData.detailsMap === 'object') {
          const seen = new Set<string>();
          Object.values(rawData.detailsMap).forEach((item: any) => {
            if (item && item.id_dat && item.id_dat !== 'N/A' && !seen.has(item.id_dat)) {
              seen.add(item.id_dat);
              bookingList.push(item);
            }
          });
        } else if (Array.isArray(rawData.data)) {
          bookingList = rawData.data;
        }

        if (bookingList && bookingList.length > 0) {
          const parsedBookings: BookingPayload[] = bookingList.map((item: any) => ({
            id_dat: String(item.id_dat || ''),
            ngay_dat: normalizeDateString(item.ngay_dat),
            gio_dat: String(item.gio_dat || ''),
            ten_khach: String(item.ten_khach || ''),
            sdt: String(item.sdt || ''),
            so_khach: Number(item.so_khach) || 0,
            tien_coc: Number(item.tien_coc || item.Tien_coc || item.so_tien_coc) || 0,
            ghi_chu: String(item.ghi_chu || ''),
            danh_sach_ban: parseTableList(item.danh_sach_ban || item.danh_sach_ban_raw),
            nguoi_nhap: String(item.nguoi_nhap || ''),
            trang_thai: String(item.trang_thai || 'ĐÃ ĐẶT'),
            created_at: item.created_at || new Date().toISOString(),
          }));
          localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(parsedBookings));
        }

        // Chuẩn hóa key mã bàn (B01 -> 1, B54 -> 54, 70 -> VIP70) và giá trị trạng thái
        const normalizedMap: Record<string, TableStatusClass> = {};
        const metaKeys = new Set(['status', 'message', 'statusmap', 'detailsmap', 'bookings', 'data']);

        Object.entries(rawMap).forEach(([rawKey, val]) => {
          if (metaKeys.has(rawKey.toLowerCase())) return;
          const normKey = normalizeTableId(rawKey);
          if (!normKey) return;
          const normVal = mapTrangThaiToTableStatus(String(val));
          if (normVal !== 'empty') {
            normalizedMap[normKey] = normVal;
            // Gán thêm alias để tra cứu linh hoạt
            if (rawKey !== normKey) {
              normalizedMap[rawKey] = normVal;
            }
            if (/^\d+$/.test(normKey)) {
              normalizedMap[`B${('0' + normKey).slice(-2)}`] = normVal;
              const num = parseInt(normKey, 10);
              if ([70, 72, 74, 76].includes(num)) {
                normalizedMap[`VIP${num}`] = normVal;
              }
            } else if (normKey === 'VIP1') {
              normalizedMap['2A'] = normVal;
            } else if (normKey === 'VIP2') {
              normalizedMap['2B'] = normVal;
            }
          }
        });

        localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(normalizedMap));
        return normalizedMap;
      } catch (error) {
        console.warn('GAS Network failed:', error);
        // Khi dùng Real GAS, nếu mạng lỗi tạm thời thì đọc từ cache gần nhất đã lưu, không nạp mock ngẫu nhiên
        const stored = localStorage.getItem(STORAGE_KEY_TABLES);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return {};
          }
        }
        return {};
      }
    }

    // Local Persistence Fallback & Simulator (chỉ khi CHƯA kết nối URL Google Apps Script)
    const { tableStatusMap } = initializeLocalStorage();
    return tableStatusMap;
  }

  /**
   * 2. POST: Gửi hành động về GAS Engine
   */
  async sendAction<T = unknown>(payload: Record<string, unknown>): Promise<{ status: string; message?: string; data?: T }> {
    // Nếu là thao tác đọc món ăn, định tuyến an toàn qua GET để tuyệt đối không kích hoạt POST thêm dòng vào DATBAN
    if (payload.action === 'GET_MENUS' && payload.id_dat) {
      const items = await this.getOrderMenus(String(payload.id_dat));
      return { status: 'success', data: items as unknown as T };
    }
    if (payload.action === 'GET_ALL_DATMON' || payload.action === 'GET_ALL_MENUS') {
      const items = await this.getAllDatMonMenus();
      return { status: 'success', data: items as unknown as T };
    }

    // Luôn thực thi cập nhật local state trước để UI mượt mà (<50ms Optimistic UI)
    const localResult = await this.executeLocalAction<T>(payload);

    if (this.isUsingRealGas()) {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        const resJson = await response.json();
        return resJson;
      } catch (error) {
        console.warn(`GAS Action [${payload.action}] failed over network, local state preserved:`, error);
      }
    }

    return localResult;
  }

  /**
   * Local state engine executing the exact Google Apps Script backend logic
   */
  private executeLocalAction<T>(payload: Record<string, unknown>): Promise<{ status: string; message?: string; data?: T }> {
    const { action } = payload;
    const db = initializeLocalStorage();

    if (action === 'BOOK') {
      const {
        danh_sach_ban,
        ten_khach,
        sdt,
        ngay_dat,
        gio_dat,
        so_khach,
        tien_coc,
        ghi_chu,
        nguoi_nhap,
      } = payload as unknown as BookingPayload;

      const newId = generateBookingId(db.bookings.length);
      const newBooking: BookingPayload = {
        id_dat: newId,
        danh_sach_ban: Array.isArray(danh_sach_ban) ? danh_sach_ban : [String(danh_sach_ban)],
        ten_khach: String(ten_khach || ''),
        sdt: String(sdt || ''),
        ngay_dat: String(ngay_dat || getTodayDateString()),
        gio_dat: String(gio_dat || getCurrentTimeString()),
        so_khach: Number(so_khach) || 2,
        tien_coc: Number(tien_coc) || 0,
        ghi_chu: String(ghi_chu || ''),
        nguoi_nhap: String(nguoi_nhap || 'Chủ SMO'),
        trang_thai: 'ĐÃ ĐẶT',
        created_at: new Date().toISOString(),
      };

      // 1. Cập nhật CONFIG_BAN cột H = "ĐÃ ĐẶT" (status = 'booked')
      newBooking.danh_sach_ban.forEach((tableId) => {
        db.tableStatusMap[tableId] = 'booked';
      });

      // 2. Append row vào sheet DATBAN
      db.bookings.unshift(newBooking);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đặt bàn thành công đơn ${newId}`,
        data: newBooking as unknown as T,
      });
    }

    if (action === 'UPDATE_STATUS') {
      const tableList = (payload.danh_sach_ban as string[]) || [];
      const trangThai = String(payload.trang_thai || '');
      let mappedStatus: TableStatusClass = 'empty';

      if (trangThai === 'ĐÃ XÁC NHẬN') mappedStatus = 'confirmed';
      else if (trangThai === 'ĐÃ ĐẾN') mappedStatus = 'arrived';
      else if (trangThai === 'HỦY') mappedStatus = 'empty';

      tableList.forEach((rawId) => {
        const id = normalizeTableId(rawId);
        if (mappedStatus === 'empty') {
          delete db.tableStatusMap[id];
          delete db.tableStatusMap[rawId];
          delete db.tableStatusMap[`B${('0' + id).slice(-2)}`];
          delete db.tableStatusMap[`B${('0' + rawId).slice(-2)}`];
          if (['70', '72', '74', '76'].includes(id)) delete db.tableStatusMap[`VIP${id}`];
          if (id === 'VIP1' || id === '2A') {
            delete db.tableStatusMap['VIP1'];
            delete db.tableStatusMap['2A'];
          }
          if (id === 'VIP2' || id === '2B') {
            delete db.tableStatusMap['VIP2'];
            delete db.tableStatusMap['2B'];
          }
        } else {
          db.tableStatusMap[id] = mappedStatus;
        }
      });

      // Update related bookings status in DATBAN
      db.bookings = db.bookings.map((b) => {
        const hasTable = b.danh_sach_ban.some((t) => tableList.includes(t));
        if (hasTable && b.trang_thai !== 'HỦY') {
          return { ...b, trang_thai: trangThai };
        }
        return b;
      });

      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã cập nhật trạng thái sang ${trangThai}`,
        data: { danh_sach_ban: tableList, trang_thai: trangThai } as unknown as T,
      });
    }

    if (action === 'LOCK' || action === 'UNLOCK') {
      const rawTableList = (payload.danh_sach_ban as string[]) || [];
      const isUnlock = payload.unlock === true || action === 'UNLOCK';
      const tableList = rawTableList.map((t) => normalizeTableId(t)).filter(Boolean);

      tableList.forEach((id) => {
        if (isUnlock) {
          delete db.tableStatusMap[id];
          delete db.tableStatusMap[`B${('0' + id).slice(-2)}`];
        } else {
          db.tableStatusMap[id] = 'inactive';
        }
      });

      // Nếu mở khóa, cập nhật các đơn khóa bàn trong danh sách booking thành HỦY
      if (isUnlock) {
        db.bookings = db.bookings.map((b) => {
          const hasTable = b.danh_sach_ban.some((t) => tableList.includes(normalizeTableId(t)));
          if (hasTable && (b.trang_thai === 'NO-SHOW' || b.ten_khach === 'KHÓA BÀN')) {
            return { ...b, trang_thai: 'HỦY' };
          }
          return b;
        });
        localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));
      }

      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));

      return Promise.resolve({
        status: 'SUCCESS',
        message: isUnlock ? `Đã mở khóa bàn ${tableList.join(', ')} thành bàn trống` : `Đã khóa bàn ${tableList.join(', ')}`,
        data: { danh_sach_ban: tableList, is_unlock: isUnlock } as unknown as T,
      });
    }

    if (action === 'GET_MENUS') {
      const idDat = String(payload.id_dat || '');
      const menus = db.orderMenus.filter((m) => m.id_dat === idDat && m.trang_thai_mon === 'ACTIVE');
      return Promise.resolve({
        status: 'SUCCESS',
        data: menus as unknown as T,
      });
    }

    if (action === 'ADD_MENU') {
      const idDat = String(payload.id_dat || '');
      const items = (payload.items as Array<{ ten_mon: string; so_luong: number; don_gia?: number; ghi_chu?: string }>) || [];

      const existingForBooking = db.orderMenus.filter((m) => m.id_dat === idDat);
      let count = existingForBooking.length;

      const addedItems: OrderMenuItem[] = items.map((item) => {
        count += 1;
        const newMonId = generateMenuItemId(idDat, count);
        const donGia = Number(item.don_gia) || 0;
        const soLuong = Number(item.so_luong) || 1;
        const thanhTien = donGia * soLuong;
        return {
          id_mon: newMonId,
          id_dat: idDat,
          ten_mon: item.ten_mon,
          so_luong: soLuong,
          don_gia: donGia,
          thanh_tien: thanhTien,
          ghi_chu: item.ghi_chu || '',
          trang_thai_mon: 'ACTIVE',
          created_at: new Date().toISOString(),
        };
      });

      db.orderMenus.push(...addedItems);
      localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã thêm ${addedItems.length} món vào đơn ${idDat}`,
        data: addedItems as unknown as T,
      });
    }

    if (action === 'UPDATE_MENU') {
      const idMon = String(payload.id_mon || '');
      const soLuong = Number(payload.so_luong);
      const tenMon = payload.ten_mon ? String(payload.ten_mon) : undefined;

      db.orderMenus = db.orderMenus.map((m) => {
        if (m.id_mon === idMon) {
          const newQty = !isNaN(soLuong) && soLuong > 0 ? soLuong : m.so_luong;
          const donGia = Number(m.don_gia) || 0;
          return {
            ...m,
            so_luong: newQty,
            thanh_tien: donGia * newQty,
            ten_mon: tenMon || m.ten_mon,
          };
        }
        return m;
      });

      localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã cập nhật món ${idMon}`,
        data: { id_mon: idMon, so_luong: soLuong } as unknown as T,
      });
    }

    if (action === 'DELETE_MENU') {
      const idMon = String(payload.id_mon || '');

      // Soft Delete: Đổi trang_thai_mon = 'ĐÃ XÓA'
      db.orderMenus = db.orderMenus.map((m) => {
        if (m.id_mon === idMon) {
          return {
            ...m,
            trang_thai_mon: 'ĐÃ XÓA',
          };
        }
        return m;
      });

      localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã xóa món ${idMon}`,
        data: { id_mon: idMon } as unknown as T,
      });
    }

    if (action === 'MOVE_TABLE') {
      const idDat = String(payload.id_dat || '');
      const oldTables = (payload.old_tables as string[]) || [];
      const newTables = (payload.new_tables as string[]) || [];

      // Find target booking
      const bookingIndex = db.bookings.findIndex((b) => b.id_dat === idDat);
      let targetBooking = bookingIndex >= 0 ? db.bookings[bookingIndex] : null;

      if (!targetBooking && oldTables.length > 0) {
        targetBooking = db.bookings.find(
          (b) => b.trang_thai !== 'HỦY' && b.danh_sach_ban.some((t) => oldTables.includes(t))
        ) || null;
      }

      if (!targetBooking) {
        return Promise.resolve({
          status: 'ERROR',
          message: 'Không tìm thấy thông tin đơn đặt bàn cần dời',
        });
      }

      // Xác định trạng thái kỹ thuật hiện tại của bàn cũ để gán cho bàn mới
      let tableStatusClass: TableStatusClass = 'booked';
      if (targetBooking.trang_thai === 'ĐÃ XÁC NHẬN') tableStatusClass = 'confirmed';
      else if (targetBooking.trang_thai === 'ĐÃ ĐẾN') tableStatusClass = 'arrived';

      // 1. Giải phóng toàn bộ nhóm bàn cũ về Trống
      const sourceTablesToFree = targetBooking.danh_sach_ban.length > 0 ? targetBooking.danh_sach_ban : oldTables;
      sourceTablesToFree.forEach((id) => {
        delete db.tableStatusMap[id];
      });

      // 2. Chuyển nhóm bàn mới sang trạng thái đang có khách
      newTables.forEach((id) => {
        db.tableStatusMap[id] = tableStatusClass;
      });

      // 3. Cập nhật danh sách bàn trong đơn hàng DATBAN
      targetBooking.danh_sach_ban = newTables;
      db.bookings = db.bookings.map((b) => (b.id_dat === targetBooking?.id_dat ? targetBooking : b));

      // 4. Cập nhật danh sách bàn tương ứng trong tab DATMON
      db.orderMenus = db.orderMenus.map((item) => {
        if (item.id_dat === targetBooking.id_dat) {
          return {
            ...item,
            danh_sach_ban: formatTableListDisplay(newTables),
            ten_ban: newTables[0] ? formatTableStandardCode(newTables[0]) : (item.ten_ban || ''),
          };
        }
        return item;
      });

      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));
      localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã dời bàn từ [${sourceTablesToFree.join(', ')}] sang [${newTables.join(', ')}]`,
        data: {
          id_dat: targetBooking.id_dat,
          old_tables: sourceTablesToFree,
          new_tables: newTables,
          booking: targetBooking,
        } as unknown as T,
      });
    }

    if (action === 'LINK_TABLE') {
      const idDat = String(payload.id_dat || '');
      const addedTables = (payload.added_tables as string[]) || [];

      // Find target booking
      const booking = db.bookings.find((b) => b.id_dat === idDat && b.trang_thai !== 'HỦY');
      if (!booking) {
        return Promise.resolve({
          status: 'ERROR',
          message: 'Không tìm thấy thông tin đơn đặt bàn để nối thêm bàn',
        });
      }

      let tableStatusClass: TableStatusClass = 'booked';
      if (booking.trang_thai === 'ĐÃ XÁC NHẬN') tableStatusClass = 'confirmed';
      else if (booking.trang_thai === 'ĐÃ ĐẾN') tableStatusClass = 'arrived';

      // Ghép bàn mới vào danh sách bàn của đơn
      const mergedTables = Array.from(new Set([...booking.danh_sach_ban, ...addedTables]));
      booking.danh_sach_ban = mergedTables;

      // Cập nhật trạng thái các bàn được nối thêm
      addedTables.forEach((id) => {
        db.tableStatusMap[id] = tableStatusClass;
      });

      db.bookings = db.bookings.map((b) => (b.id_dat === booking.id_dat ? booking : b));

      // Cập nhật danh sách bàn trong tab DATMON khi ghép bàn
      db.orderMenus = db.orderMenus.map((item) => {
        if (item.id_dat === booking.id_dat) {
          return {
            ...item,
            danh_sach_ban: formatTableListDisplay(mergedTables),
            ten_ban: mergedTables[0] ? formatTableStandardCode(mergedTables[0]) : (item.ten_ban || ''),
          };
        }
        return item;
      });

      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));
      localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã gộp/nối thêm bàn [${addedTables.join(', ')}] vào đơn ${booking.id_dat}`,
        data: {
          id_dat: booking.id_dat,
          danh_sach_ban: mergedTables,
          booking,
        } as unknown as T,
      });
    }

    if (action === 'UPDATE_BOOKING' || action === 'UPDATE_BOOKING_INFO') {
      const updatedBooking = (payload.booking || payload) as BookingPayload;
      if (!updatedBooking || !updatedBooking.id_dat) {
        return Promise.resolve({
          status: 'ERROR',
          message: 'Dữ liệu đơn đặt bàn không hợp lệ',
        });
      }

      const existingIndex = db.bookings.findIndex((b) => b.id_dat === updatedBooking.id_dat);
      if (existingIndex < 0) {
        return Promise.resolve({
          status: 'ERROR',
          message: 'Không tìm thấy đơn đặt bàn cần cập nhật',
        });
      }

      const oldBooking = db.bookings[existingIndex];
      const oldTables = oldBooking.danh_sach_ban || [];
      const newTables = updatedBooking.danh_sach_ban || [];

      // Determine new table status class
      let tableStatusClass: TableStatusClass = 'booked';
      if (updatedBooking.trang_thai === 'ĐÃ XÁC NHẬN') tableStatusClass = 'confirmed';
      else if (updatedBooking.trang_thai === 'ĐÃ ĐẾN') tableStatusClass = 'arrived';
      else if (updatedBooking.trang_thai === 'HỦY') tableStatusClass = 'empty';

      // 1. Release tables that were in oldBooking but are NOT in newTables (or if status is HỦY)
      oldTables.forEach((tId) => {
        if (!newTables.includes(tId) || updatedBooking.trang_thai === 'HỦY') {
          // Check if any other active booking uses this table
          const otherBookingUses = db.bookings.some(
            (b) => b.id_dat !== updatedBooking.id_dat && b.trang_thai !== 'HỦY' && b.danh_sach_ban?.includes(tId)
          );
          if (!otherBookingUses) {
            delete db.tableStatusMap[tId];
          }
        }
      });

      // 2. Set new tables if not HỦY
      if (updatedBooking.trang_thai !== 'HỦY') {
        newTables.forEach((tId) => {
          db.tableStatusMap[tId] = tableStatusClass;
        });
      }

      // 3. Save booking
      db.bookings[existingIndex] = updatedBooking;

      // 4. Update DATMON if tables changed
      if (newTables.length > 0) {
        db.orderMenus = db.orderMenus.map((item) => {
          if (item.id_dat === updatedBooking.id_dat) {
            return {
              ...item,
              danh_sach_ban: formatTableListDisplay(newTables),
              ten_ban: newTables[0] ? formatTableStandardCode(newTables[0]) : (item.ten_ban || ''),
            };
          }
          return item;
        });
        localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));
      }

      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(db.tableStatusMap));
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(db.bookings));

      return Promise.resolve({
        status: 'SUCCESS',
        message: `Đã cập nhật thông tin đơn ${updatedBooking.id_dat}`,
        data: updatedBooking as unknown as T,
      });
    }

    return Promise.resolve({
      status: 'ERROR',
      message: `Unknown action ${action}`,
    });
  }

  // Update existing booking info
  async updateBooking(booking: BookingPayload) {
    return this.sendAction<BookingPayload>({
      action: 'UPDATE_BOOKING_INFO',
      id_dat: booking.id_dat,
      ten_khach: booking.ten_khach,
      sdt: booking.sdt,
      so_khach: booking.so_khach,
      gio_dat: booking.gio_dat,
      ngay_dat: booking.ngay_dat,
      tien_coc: booking.tien_coc,
      ghi_chu: booking.ghi_chu,
      nguoi_nhap: booking.nguoi_nhap,
      danh_sach_ban: booking.danh_sach_ban,
      trang_thai: booking.trang_thai,
      booking,
    });
  }

  // Get all bookings from real GAS or local store
  async getAllBookings(selectedDate?: string): Promise<BookingPayload[]> {
    if (this.isUsingRealGas()) {
      try {
        const queryParam = selectedDate && selectedDate !== 'ALL'
          ? `?action=GET_BOOKINGS&date=${encodeURIComponent(selectedDate)}`
          : `?action=GET_BOOKINGS`;
        const response = await fetch(`${this.apiUrl}${queryParam}`, { method: 'GET' });
        if (response.ok) {
          const res = await response.json();
          let rawList: any[] = [];
          if (Array.isArray(res)) {
            rawList = res;
          } else if (Array.isArray(res.bookings)) {
            rawList = res.bookings;
          } else if (Array.isArray(res.data)) {
            rawList = res.data;
          } else if (res.detailsMap && typeof res.detailsMap === 'object') {
            const seen = new Set<string>();
            Object.values(res.detailsMap).forEach((item: any) => {
              if (item && item.id_dat && item.id_dat !== 'N/A' && !seen.has(item.id_dat)) {
                seen.add(item.id_dat);
                rawList.push(item);
              }
            });
          }

          // Khi đã kết nối Real GAS: Map danh sách thực tế từ Sheet.
          // Nếu Sheet rỗng (chưa có đơn nào), lưu [] và trả về [] chứ KHÔNG dùng mock!
          const parsedList: BookingPayload[] = rawList.map((item: any) => ({
            id_dat: String(item.id_dat || ''),
            ngay_dat: normalizeDateString(item.ngay_dat),
            gio_dat: String(item.gio_dat || ''),
            ten_khach: String(item.ten_khach || ''),
            sdt: String(item.sdt || ''),
            so_khach: Number(item.so_khach) || 0,
            tien_coc: Number(item.tien_coc || item.Tien_coc || item.so_tien_coc) || 0,
            ghi_chu: String(item.ghi_chu || ''),
            danh_sach_ban: parseTableList(item.danh_sach_ban || item.danh_sach_ban_raw),
            nguoi_nhap: String(item.nguoi_nhap || ''),
            trang_thai: String(item.trang_thai || 'ĐÃ ĐẶT'),
            created_at: item.created_at || new Date().toISOString(),
          }));

          localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(parsedList));
          return parsedList;
        }
      } catch (err) {
        console.warn('Lỗi khi fetch đơn đặt bàn từ GAS, dùng cache cục bộ:', err);
        const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && selectedDate && selectedDate !== 'ALL') {
              return parsed.filter((b) => isDateMatching(b.ngay_dat, selectedDate));
            }
            return parsed;
          } catch {
            return [];
          }
        }
        return [];
      }
    }

    const db = initializeLocalStorage();
    if (selectedDate && selectedDate !== 'ALL') {
      return db.bookings.filter((b) => isDateMatching(b.ngay_dat, selectedDate));
    }
    return db.bookings;
  }

  // Lấy toàn bộ danh sách món ăn từ tab DATMON của Google Sheet
  async getAllDatMonMenus(): Promise<OrderMenuItem[]> {
    if (this.isUsingRealGas()) {
      try {
        const response = await fetch(`${this.apiUrl}?action=GET_ALL_DATMON`, {
          method: 'GET',
        });
        if (response.ok) {
          const res = await response.json();
          const list = Array.isArray(res) ? res : res.data || [];
          if (Array.isArray(list)) {
            const parsed = list
              .filter((m: any) => m.trang_thai_mon !== 'ĐÃ XÓA')
              .map((m: any) => {
                const donGia = Number(m.don_gia) || 0;
                const soLuong = Number(m.so_luong) || 1;
                const thanhTien = Number(m.thanh_tien) || (donGia * soLuong);
                return {
                  id_mon: String(m.id_mon || ''),
                  id_dat: String(m.id_dat || ''),
                  ten_mon: String(m.ten_mon || ''),
                  so_luong: soLuong,
                  don_gia: donGia,
                  thanh_tien: thanhTien,
                  ghi_chu: String(m.ghi_chu || ''),
                  trang_thai_mon: 'ACTIVE' as const,
                  ngay_dat: m.ngay_dat ? String(m.ngay_dat) : undefined,
                  gio_dat: m.gio_dat ? String(m.gio_dat) : undefined,
                  danh_sach_ban: m.danh_sach_ban ? String(m.danh_sach_ban) : undefined,
                  ten_khach: m.ten_khach ? String(m.ten_khach) : undefined,
                };
              });
            localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(parsed));
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi lấy toàn bộ DATMON từ GAS:', err);
        const stored = localStorage.getItem(STORAGE_KEY_ORDER_MENUS);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return [];
          }
        }
        return [];
      }
    }

    const db = initializeLocalStorage();
    return db.orderMenus.filter((m) => m.trang_thai_mon !== 'ĐÃ XÓA');
  }

  // Get order menus (DATMON) for a specific booking from real GAS or local store
  async getOrderMenus(idDat: string): Promise<OrderMenuItem[]> {
    if (this.isUsingRealGas()) {
      try {
        const response = await fetch(`${this.apiUrl}?action=GET_MENUS&id_dat=${encodeURIComponent(idDat)}`, {
          method: 'GET',
        });
        if (response.ok) {
          const res = await response.json();
          const list = Array.isArray(res) ? res : res.data || [];
          if (Array.isArray(list)) {
            const activeDishes: OrderMenuItem[] = list
              .filter((m: any) => m.trang_thai_mon !== 'ĐÃ XÓA')
              .map((m: any) => {
                const donGia = Number(m.don_gia) || 0;
                const soLuong = Number(m.so_luong) || 1;
                const thanhTien = Number(m.thanh_tien) || (donGia * soLuong);
                return {
                  id_mon: String(m.id_mon || ''),
                  id_dat: String(m.id_dat || idDat),
                  chi_nhanh: m.chi_nhanh ? String(m.chi_nhanh) : undefined,
                  ten_mon: String(m.ten_mon || ''),
                  so_luong: soLuong,
                  don_gia: donGia,
                  thanh_tien: thanhTien,
                  ghi_chu: String(m.ghi_chu || ''),
                  trang_thai_mon: 'ACTIVE' as const,
                  ngay_dat: m.ngay_dat ? String(m.ngay_dat) : undefined,
                  gio_dat: m.gio_dat ? String(m.gio_dat) : undefined,
                  danh_sach_ban: m.danh_sach_ban ? String(m.danh_sach_ban) : undefined,
                  so_khach: m.so_khach ? Number(m.so_khach) : undefined,
                  ten_khach: m.ten_khach ? String(m.ten_khach) : undefined,
                };
              });

            // Sync with local cache: if remote returned items, update cache.
            // If remote returned empty (e.g. slight lag), preserve any locally added items.
            const db = initializeLocalStorage();
            if (activeDishes.length > 0) {
              const otherMenus = db.orderMenus.filter((m) => m.id_dat !== idDat);
              db.orderMenus = [...otherMenus, ...activeDishes];
              localStorage.setItem(STORAGE_KEY_ORDER_MENUS, JSON.stringify(db.orderMenus));
              return activeDishes;
            } else {
              const existingLocal = db.orderMenus.filter((m) => m.id_dat === idDat && m.trang_thai_mon !== 'ĐÃ XÓA');
              if (existingLocal.length > 0) {
                return existingLocal;
              }
              return [];
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải món ăn từ GAS DATMON:', err);
      }
    }

    const db = initializeLocalStorage();
    return db.orderMenus.filter((m) => m.id_dat === idDat && m.trang_thai_mon !== 'ĐÃ XÓA');
  }

  // Get master menu list (MENU_MON) with real-time INACTIVATE status from sheet
  async getMasterMenus(): Promise<MasterMenuItem[]> {
    if (this.isUsingRealGas()) {
      try {
        const response = await fetch(`${this.apiUrl}?action=GET_MENU_MON`, { method: 'GET' });
        if (response.ok) {
          const res = await response.json();
          const list = Array.isArray(res) ? res : res.data || [];
          if (Array.isArray(list) && list.length > 0) {
            const mapped: MasterMenuItem[] = list.map((item: any) => {
              const rawStatus = (item.trang_thai || item.trang_thai_mon || '').toString().trim().toUpperCase();
              const isInactive = rawStatus === 'INACTIVATE' || rawStatus === 'INACTIVE' || rawStatus === 'NGƯNG' || rawStatus === 'HẾT' || rawStatus === 'TẠM HẾT';
              return {
                id_mon_master: String(item.id_mon_master || item.ma_mon || ''),
                ma_mon: String(item.ma_mon || item.id_mon_master || ''),
                ten_mon: String(item.ten_mon || ''),
                nhom_mon: String(item.nhom_mon || item.danh_muc || 'Món chính'),
                danh_muc: String(item.danh_muc || item.nhom_mon || 'Món chính'),
                loai_menu: String(item.loai_menu || 'Thường'),
                don_vi_tinh: String(item.don_vi_tinh || 'Phần'),
                don_gia: Number(item.don_gia) || 0,
                mo_ta_chi_tiet: String(item.mo_ta_chi_tiet || ''),
                trang_thai: isInactive ? 'INACTIVATE' : 'ACTIVE',
              };
            });
            const db = initializeLocalStorage();
            db.masterMenus = mapped;
            localStorage.setItem(STORAGE_KEY_MASTER_MENUS, JSON.stringify(mapped));
            return mapped;
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải thực đơn MENU_MON từ GAS:', err);
      }
    }

    const db = initializeLocalStorage();
    return db.masterMenus;
  }

  // Add custom master dish
  async addMasterMenuItem(item: Omit<MasterMenuItem, 'id_mon_master'>): Promise<MasterMenuItem> {
    const db = initializeLocalStorage();
    const newId = `MON-${String(db.masterMenus.length + 1).padStart(3, '0')}`;
    const newItem: MasterMenuItem = {
      ...item,
      id_mon_master: newId,
    };
    db.masterMenus.push(newItem);
    localStorage.setItem(STORAGE_KEY_MASTER_MENUS, JSON.stringify(db.masterMenus));
    return newItem;
  }

  // Trigger update of VIEW_HOMNAY and VIEW_BEP_HOMNAY in Google Sheet
  async syncSheetViewsToday(): Promise<{ status: string; message?: string }> {
    return this.sendAction({ action: 'UPDATE_VIEWS' });
  }

  // Diagnose n8n data from DATBAN sheet
  async diagnoseN8nData(filterDate?: string): Promise<{
    status: string;
    message?: string;
    total_rows?: number;
    headers?: string[];
    filter_date_requested?: string;
    recent_rows?: Array<{
      row_index: number;
      data: Record<string, any>;
      raw_date: string;
      date_matched: boolean;
      raw_tables: string;
      parsed_tables: string[];
      raw_status: string;
      status_class: string;
    }>;
  }> {
    const url = this.getApiUrl();
    if (!url) {
      return {
        status: 'error',
        message: 'Chưa cấu hình Google Apps Script Web App URL.',
      };
    }

    try {
      const targetUrl = new URL(url);
      targetUrl.searchParams.set('action', 'DIAGNOSE_N8N');
      if (filterDate) targetUrl.searchParams.set('date', filterDate);

      const response = await fetch(targetUrl.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      return {
        status: 'error',
        message: err.message || 'Lỗi khi kết nối đến Google Apps Script',
      };
    }
  }

  // Reset demo data to initial baseline
  resetDemoData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_TABLES);
      localStorage.removeItem(STORAGE_KEY_BOOKINGS);
      localStorage.removeItem(STORAGE_KEY_ORDER_MENUS);
      localStorage.removeItem(STORAGE_KEY_MASTER_MENUS);
      initializeLocalStorage();
    }
  }
}

export const gasApi = new GasApiService();
