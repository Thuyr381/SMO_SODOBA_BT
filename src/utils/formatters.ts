// src/utils/formatters.ts

/**
 * Định dạng tiền tệ Việt Nam Đồng (VNĐ)
 */
export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Định dạng ngày YYYY-MM-DD theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
 */
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Returns YYYY-MM-DD
  } catch {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const getTodayDateVN = getTodayDateString;

/**
 * Định dạng giờ hiện tại HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Chuyển đổi giờ 24h (HH:mm) sang định dạng 12h có AM/PM (ví dụ: "18:30" -> "06:30 PM", "11:15" -> "11:15 AM")
 */
export function formatTime24To12(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (/AM|PM/i.test(trimmed)) return trimmed;

  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  if (isNaN(hour)) return timeStr;

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  const formattedHour = String(hour).padStart(2, '0');
  return `${formattedHour}:${minutes} ${period}`;
}

/**
 * Lấy nhãn thời gian kết hợp cả 24h và 12h (ví dụ: "19:00 (07:00 PM)")
 */
export function formatTimeDual(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  let time24 = trimmed;
  // Nếu chuỗi đang ở dạng 12h có AM/PM, chuyển về 24h
  if (/AM|PM/i.test(trimmed)) {
    const match = trimmed.match(/(\d{1,2}):(\d{2})/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const isPM = /PM/i.test(trimmed);
      const isAM = /AM/i.test(trimmed);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      time24 = `${String(h).padStart(2, '0')}:${m}`;
    }
  } else {
    const match = trimmed.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      time24 = `${String(parseInt(match[1], 10)).padStart(2, '0')}:${match[2]}`;
    }
  }
  const time12 = formatTime24To12(time24);
  return `${time24} (${time12})`;
}


/**
 * Sinh mã đơn đặt bàn theo chuẩn S8-YYYYMMDD-XXX
 */
export function generateBookingId(existingCount: number = 0): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(existingCount + 1).padStart(3, '0');
  return `S8-${year}${month}${day}-${seq}`;
}

/**
 * Sinh mã món ăn theo chuẩn ID_DAT-M01
 */
export function generateMenuItemId(idDat: string, itemIndex: number = 1): string {
  const seq = String(itemIndex).padStart(2, '0');
  return `${idDat}-M${seq}`;
}

/**
 * Kiểm tra số điện thoại Việt Nam hợp lệ (hỗ trợ các đầu số 10 số, số bàn, +84, 84...)
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.trim().replace(/[\s.\-()]/g, '');
  // Chấp nhận 10 chữ số chuẩn (bắt đầu bằng 0 hoặc 10 chữ số bất kỳ), hoặc đầu +84/84 (11-12 ký tự)
  const regex = /^(?:\+?84|0)?[0-9]{9,10}$/;
  return regex.test(cleanPhone) && cleanPhone.length >= 9 && cleanPhone.length <= 13;
}
