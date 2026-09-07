// src/utils/tableHelper.ts
import { TableStatusClass } from '../types';

/**
 * Chuẩn hóa mã bàn:
 * - Loại bỏ từ 'Bàn', 'Ban', 'Phòng', 'Phong'
 * - Map các phòng VIP Tân Phú S8:
 *   + 70, B70, VIP70, VIP 70 -> 'VIP70'
 *   + 72, B72, VIP72, VIP 72 -> 'VIP72'
 *   + 74, B74, VIP74, VIP 74 -> 'VIP74'
 *   + 76, B76, VIP76, VIP 76 -> 'VIP76'
 *   + 2A, Lầu 2A, Lau 2A, VIP1, VIP 1 -> 'VIP1'
 *   + 2B, Lầu 2B, Lau 2B, VIP2, VIP 2 -> 'VIP2'
 * - Các bàn thường: B01 -> 1, B1 -> 1, B54 -> 54, 01 -> 1
 */
export function normalizeTableId(rawId: string | number | undefined | null): string {
  if (rawId === undefined || rawId === null) return '';
  let trimmed = String(rawId).trim().toUpperCase();
  if (!trimmed) return '';

  // Bóc tách ngoặc vuông và dấu nháy JSON từ luồng n8n (ví dụ '["B54"]' hay '["54"]')
  trimmed = trimmed.replace(/[\[\]"'\\]/g, '').trim();

  // Bỏ từ khóa tiếng Việt hoặc tiếng Anh
  trimmed = trimmed
    .replace(/^BÀN\s*/i, '')
    .replace(/^BAN\s*/i, '')
    .replace(/^PHÒNG\s*/i, '')
    .replace(/^PHONG\s*/i, '')
    .replace(/^TABLE\s*/i, '')
    .trim();

  // Kiểm tra Lầu 2A / VIP 1
  if (trimmed.includes('2A') || trimmed === 'VIP1' || trimmed === 'VIP 1' || trimmed === 'LẦU 2A' || trimmed === 'LAU 2A') {
    return 'VIP1';
  }

  // Kiểm tra Lầu 2B / VIP 2
  if (trimmed.includes('2B') || trimmed === 'VIP2' || trimmed === 'VIP 2' || trimmed === 'LẦU 2B' || trimmed === 'LAU 2B') {
    return 'VIP2';
  }

  // Nhóm phòng VIP Lầu 1: 70, 72, 74, 76
  const matchVipLau1 = trimmed.match(/^(?:VIP\s*|B)?(70|72|74|76)$/i);
  if (matchVipLau1) {
    return `VIP${matchVipLau1[1]}`;
  }

  // B01, B1, B54, B10...
  const matchB = trimmed.match(/^B0*(\d+)$/i);
  if (matchB) {
    const num = parseInt(matchB[1], 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      return `VIP${num}`;
    }
    return String(num);
  }

  // Pure digits with leading zeros like "01" -> "1"
  const matchNum = trimmed.match(/^0*(\d+)$/);
  if (matchNum) {
    const num = parseInt(matchNum[1], 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      return `VIP${num}`;
    }
    return String(num);
  }

  return trimmed;
}

/**
 * So sánh 2 mã bàn xem có trùng nhau không sau khi đã chuẩn hóa
 */
export function areTableIdsEqual(
  idA: string | number | undefined | null,
  idB: string | number | undefined | null
): boolean {
  const normA = normalizeTableId(idA);
  const normB = normalizeTableId(idB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Phân tách chuỗi danh sách bàn hoặc mảng bàn thành mảng mã bàn đã được chuẩn hóa
 * Ví dụ: "B01, B02" -> ["1", "2"]
 * Ví dụ: "B54, B59" -> ["54", "59"]
 * Ví dụ: "56 - 57" -> ["56", "57"]
 * Ví dụ: "B56+B57" -> ["56", "57"]
 */
export function parseTableList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => parseTableList(item)).filter(Boolean);
  }
  if (typeof raw === 'string') {
    let str = raw.trim();
    // Thử parse nếu là chuỗi JSON array do n8n ghi (ví dụ: '["54"]' hoặc '["B54", "B55"]')
    if (str.startsWith('[') && str.endsWith(']')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeTableId).filter(Boolean);
        }
      } catch {
        // Nếu parse JSON lỗi thì bóc tách ngoặc vuông thủ công
        str = str.replace(/[\[\]]/g, '');
      }
    }
    return str
      .split(/[,;+\/\s-]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalizeTableId)
      .filter(Boolean);
  }
  return [normalizeTableId(String(raw))].filter(Boolean);
}

export interface ParsedDateInfo {
  day: number;
  month: number;
  year: number;
}

export function parseDateComponents(rawDate: string | Date | undefined | null): ParsedDateInfo | null {
  if (!rawDate) return null;
  if (rawDate instanceof Date) {
    return {
      day: rawDate.getDate(),
      month: rawDate.getMonth() + 1,
      year: rawDate.getFullYear(),
    };
  }

  const str = String(rawDate).trim();
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    return parseDateComponents(datePart);
  }

  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { day: d, month: m, year: y };
      }
    } else {
      // DD/MM/YYYY
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { day: d, month: m, year: y };
      }
    }
  }
  return null;
}

/**
 * So sánh xem 2 ngày có trùng nhau không (bỏ qua khác biệt format hay số 0 ở đầu)
 */
export function areDatesMatching(
  dateA: string | Date | undefined | null,
  dateB: string | Date | undefined | null
): boolean {
  if (!dateA || !dateB) return false;
  const pA = parseDateComponents(dateA);
  const pB = parseDateComponents(dateB);
  if (!pA || !pB) return false;
  return pA.day === pB.day && pA.month === pB.month && pA.year === pB.year;
}

export const isDateMatching = areDatesMatching;

/**
 * Chuẩn hóa chuỗi ngày tháng thành YYYY-MM-DD
 */
export function normalizeDateString(rawDate: string | Date | undefined | null): string {
  if (!rawDate) return '';
  const parsed = parseDateComponents(rawDate);
  if (parsed) {
    const d = String(parsed.day).padStart(2, '0');
    const m = String(parsed.month).padStart(2, '0');
    const y = String(parsed.year);
    return `${y}-${m}-${d}`;
  }
  return String(rawDate).trim();
}

/**
 * Chuyển trạng thái từ Google Sheet DATBAN sang TableStatusClass của SODOBA:
 * - 'ĐÃ ĐẶT', 'ĐẶT', 'BOOKED', 'CÓ KHÁCH', 'KHÁCH ĐẶT', 'GIỮ CHỖ' -> 'booked' (Màu đỏ)
 * - 'ĐÃ XÁC NHẬN', 'XÁC NHẬN', 'CONFIRMED', 'ĐÃ CỌC', 'CỌC' -> 'confirmed' (Màu cam)
 * - 'ĐÃ ĐẾN', 'ĐẾN', 'ARRIVED', 'ĐANG ĂN', 'ĐANG NGỒI' -> 'arrived' (Màu xanh lá)
 * - 'NO-SHOW', 'NOSHOW', 'KHÓA', 'LOCK', 'INACTIVE', 'BẢO TRÌ', 'BLOCK' -> 'inactive' (Khóa bàn - Màu xám)
 * - 'HỦY', 'HUY', 'CANCEL', 'TRỐNG', 'EMPTY' -> 'empty' (Màu vàng - Trống)
 */
export function mapTrangThaiToTableStatus(trangThai: string | undefined | null): TableStatusClass {
  if (!trangThai) return 'booked'; // Mặc định nếu có dòng trong DATBAN thì là đơn Đã đặt
  const clean = trangThai.trim().toUpperCase();

  // 1. Trạng thái HỦY / TRỐNG / ĐÃ VỀ (Trả bàn trống)
  if (
    clean === 'HỦY' ||
    clean === 'HUY' ||
    clean === 'CANCEL' ||
    clean === 'CANCELLED' ||
    clean === 'CANCELED' ||
    clean === 'TRỐNG' ||
    clean === 'TRONG' ||
    clean === 'EMPTY' ||
    clean === 'XÓA' ||
    clean === 'XOA' ||
    clean === 'DELETE' ||
    clean === 'ĐÃ VỀ' ||
    clean === 'DA VE' ||
    clean === 'DEPARTED' ||
    clean === 'LEAVE' ||
    clean === 'COMPLETED'
  ) {
    return 'empty';
  }

  // 2. Trạng thái KHÓA / BẢO TRÌ
  if (
    clean === 'NO-SHOW' ||
    clean === 'NOSHOW' ||
    clean === 'KHÓA' ||
    clean === 'KHOA' ||
    clean === 'LOCK' ||
    clean === 'INACTIVE' ||
    clean === 'BLOCK' ||
    clean === 'BẢO TRÌ' ||
    clean === 'BAO TRI'
  ) {
    return 'inactive';
  }

  // 3. Trạng thái ĐÃ ĐẾN
  if (
    clean.includes('ĐÃ ĐẾN') ||
    clean.includes('ARRIVED') ||
    clean === 'DEN' ||
    clean === 'ĐẾN' ||
    clean.includes('KHÁCH ĐẾN') ||
    clean.includes('ĐANG ĂN') ||
    clean.includes('ĐANG NGỒI') ||
    clean.includes('IN-USE')
  ) {
    return 'arrived';
  }

  // 4. Trạng thái ĐÃ XÁC NHẬN
  if (
    clean.includes('XÁC NHẬN') ||
    clean.includes('CONFIRMED') ||
    clean.includes('XAC NHAN') ||
    clean.includes('ĐÃ CỌC') ||
    clean.includes('CỌC') ||
    clean.includes('DEPOSIT')
  ) {
    return 'confirmed';
  }

  // 5. Mọi trạng thái còn lại (ĐÃ ĐẶT, MỚI, NEW, PENDING, CHỜ XÁC NHẬN, CHỜ DUYỆT, ONLINE, BOT, N8N,...) ĐỀU LÀ BOOKED
  return 'booked';
}

/**
 * Định dạng tên hiển thị của bàn (ví dụ: '1' -> 'Bàn 01', 'VIP1' -> 'Lầu 2A (VIP1)')
 */
export function formatTableDisplay(tableId: string | number): string {
  const norm = normalizeTableId(tableId);
  if (norm === 'VIP1') return 'Lầu 2A (VIP1)';
  if (norm === 'VIP2') return 'Lầu 2B (VIP2)';
  if (norm.startsWith('VIP')) {
    const vNum = norm.replace('VIP', '');
    if (['70', '72', '74', '76'].includes(vNum)) {
      return `Bàn B${vNum}`;
    }
    return norm;
  }
  const num = parseInt(norm, 10);
  if (!isNaN(num)) {
    return `Bàn ${num < 10 ? `0${num}` : num}`;
  }
  return `Bàn ${norm}`;
}

/**
 * Chuẩn hóa 1 mã bàn thành mã chuẩn theo cấu trúc nhà hàng:
 * - 1 -> 'B01', 5 -> 'B05', 54 -> 'B54'
 * - 70, 72, 74, 76 -> 'B70', 'B72', 'B74', 'B76' (theo yêu cầu: B72 thay vì VIP72)
 * - VIP1, VIP2 giữ nguyên chuẩn VIP
 */
export function formatTableStandardCode(tableId: string | number | undefined | null): string {
  if (!tableId) return '';
  const str = String(tableId).trim().toUpperCase();
  const clean = str.replace(/[\[\]"'\\]/g, '').trim();

  if (clean === '2A' || clean === 'VIP1' || clean === 'VIP 1' || clean === 'LẦU 2A' || clean === 'LAU 2A') return 'VIP1';
  if (clean === '2B' || clean === 'VIP2' || clean === 'VIP 2' || clean === 'LẦU 2B' || clean === 'LAU 2B') return 'VIP2';

  // Bàn 70, 72, 74, 76 -> Format thành B70, B72, B74, B76 thay vì VIP72
  const match70_76 = clean.match(/^(?:VIP\s*|B)?(70|72|74|76)$/i);
  if (match70_76) return `B${match70_76[1]}`;

  // Dạng B05, B5, B54...
  const matchB = clean.match(/^B0*(\d+)$/i);
  if (matchB) {
    const n = parseInt(matchB[1], 10);
    if (n === 70 || n === 72 || n === 74 || n === 76) return `B${n}`;
    return `B${n < 10 ? `0${n}` : n}`;
  }

  // Dạng số thuần: 5 -> B05, 54 -> B54, 05 -> B05
  const matchNum = clean.match(/^0*(\d+)$/);
  if (matchNum) {
    const n = parseInt(matchNum[1], 10);
    if (n === 70 || n === 72 || n === 74 || n === 76) return `B${n}`;
    return `B${n < 10 ? `0${n}` : n}`;
  }

  return clean;
}

/**
 * Định dạng danh sách bàn thành chuỗi chuẩn "B05, B04" hoặc "B54, B59"
 * Ngăn chặn tuyệt đối việc bị rút gọn thành "5, 4"
 */
export function formatTableListDisplay(banInput: unknown): string {
  if (!banInput) return '';
  const list = Array.isArray(banInput) ? banInput : String(banInput).split(/[,;+\/\s-]+/);
  const formatted = list
    .map((item) => formatTableStandardCode(item))
    .filter(Boolean);
  return Array.from(new Set(formatted)).join(', ');
}

