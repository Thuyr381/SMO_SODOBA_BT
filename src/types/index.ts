// src/types/index.ts

/**
 * Trạng thái kỹ thuật của Bàn trên sơ đồ
 * - empty: Trống (#fdd835)
 * - booked: Đã đặt (#d32f2f)
 * - confirmed: Xác nhận (#f57c00)
 * - arrived: Đã đến (#1976d2)
 * - inactive: Khóa (#424242)
 */
export type TableStatusClass = 'empty' | 'booked' | 'confirmed' | 'arrived' | 'inactive';

/**
 * Chế độ thao tác được chọn trên thanh Action Toolbar
 */
export type ActionMode = 'BOOK' | 'CANCEL' | 'CONFIRM' | 'ARRIVE' | 'LEAVE' | 'LOCK' | null;

/**
 * Bàn chi tiết trên Sơ đồ
 */
export interface TableItem {
  id: string; // Ví dụ: "B01", "56", "VIP1"
  cellId: string; // Số thuần túy map với sheet CONFIG_BAN (vd: "1", "56")
  name: string; // Tên hiển thị (vd: "Bàn 01", "LẦU 2A", "VIP 70")
  capacity?: number; // Sức chứa (khách)
  status: TableStatusClass;
  zone: 'GROUND' | 'GREEN' | 'VIP' | 'HALL';
  subZone?: string;
  shape?: 'rect' | 'square' | 'round' | 'wide';
  note?: string;
}

/**
 * Thông tin khách đặt bàn
 */
export interface BookingPayload {
  id_dat?: string; // S8-YYYYMMDD-XXX
  ngay_dat: string; // YYYY-MM-DD
  gio_dat: string; // HH:mm
  ten_khach: string; // Tên khách (*)
  sdt: string; // Số điện thoại (*)
  so_khach: number; // Số lượng khách
  tien_coc: number; // Số tiền cọc (VNĐ)
  ghi_chu?: string;
  danh_sach_ban: string[]; // Mảng mã bàn (vd: ["56", "57"])
  nguoi_nhap: string; // Tên Telegram User
  trang_thai?: string; // 'ĐÃ ĐẶT' | 'ĐÃ XÁC NHẬN' | 'ĐÃ ĐẾN' | 'HỦY' | 'NO-SHOW'
  created_at?: string;
}

/**
 * Danh mục Món ăn (MENU_MON / CONFIG_MON)
 */
export interface MasterMenuItem {
  id_mon_master: string;
  ma_mon?: string;
  ten_mon: string;
  nhom_mon?: string;
  loai_menu?: string;
  don_vi_tinh?: string;
  don_gia?: number;
  mo_ta_chi_tiet?: string;
  danh_muc?: string;
  hinh_anh?: string;
  trang_thai: 'ACTIVE' | 'INACTIVATE' | 'INACTIVE';
}

/**
 * Món ăn gắn với Đơn đặt bàn (DATMON)
 */
export interface OrderMenuItem {
  id_mon: string; // Khóa duy nhất (vd: S8-20260905-001-M01)
  id_dat: string; // ID đơn đặt bàn
  chi_nhanh?: string;
  ten_mon: string;
  so_luong: number;
  don_gia?: number;
  thanh_tien?: number;
  ghi_chu?: string;
  ngay_dat?: string;
  gio_dat?: string;
  danh_sach_ban?: string | string[];
  ten_ban?: string;
  so_khach?: number;
  ten_khach?: string;
  trang_thai_mon: 'ACTIVE' | 'ĐÃ XÓA';
  created_at?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}
