/**
 * ============================================================================
 * GOOGLE APPS SCRIPT HOÀN CHỈNH CHO HỆ THỐNG SODOBA TÂN PHÚ (S8)
 * MATCHING 100% CẤU TRÚC SHEET DATBAN + CONFIG_BAN + DATMON + CONFIG_MON
 * TƯƠNG THÍCH ĐỒNG THỜI CẢ PHIÊN BẢN GỐC (index.html) VÀ WEB APP MỚI (React)
 * TỰ ĐỘNG XỬ LÝ DỮ LIỆU TỪ WORKFLOW n8n (Date format, JSON table array...)
 * ============================================================================
 * 
 * 15 Cột chuẩn của Sheet DATBAN:
 * Col 1  (A): id_dat          (Ví dụ: S8-20260830-001, S8-20260904-004)
 * Col 2  (B): ngay_dat        (Ví dụ: 30/08/2026, 05/09/2026)
 * Col 3  (C): gio_dat         (Ví dụ: 19:00, 00:00)
 * Col 4  (D): ten_khach       (Ví dụ: A Long Phú Quốc, KHÓA BÀN)
 * Col 5  (E): sdt             (Ví dụ: 909561069, trống)
 * Col 6  (F): so_khach        (Ví dụ: 30, 0)
 * Col 7  (G): danh_sach_ban   (Ví dụ: B01, B02, B03, B04, B05, B54, VIP2)
 * Col 8  (H): yeu_cau_ban     (Ví dụ: TỰ ĐỘNG (GHÉP), KHÓA, TỰ ĐỘNG, CỤ THỂ)
 * Col 9  (I): dat_mon_truoc   (Ví dụ: Không, Có)
 * Col 10 (J): dat_coc         (Ví dụ: Chưa, Đã cọc)
 * Col 11 (K): Tien_coc        (Ví dụ: 500000, trống)
 * Col 12 (L): trang_thai      (Ví dụ: ĐÃ ĐẶT, ĐÃ XÁC NHẬN, ĐÃ ĐẾN, NO-SHOW, HỦY)
 * Col 13 (M): nguoi_nhap      (Ví dụ: Chủ SMO, Lễ Tân SMO, Loi, Hải...)
 * Col 14 (N): thoi_gian_nhap  (Ví dụ: 30/08/2026 15:18:29, 04/09/2026 23:44:15)
 * Col 15 (O): ghi_chu         (Ví dụ: Khóa bàn qua Mini App, 2 Ghế trẻ em)
 */

// ============================================================================
// 0. CACHE NGẮN HẠN - KHÔNG THAY ĐỔI LOGIC NGHIỆP VỤ
// ============================================================================
var SODOBA_CACHE_SCHEMA = "20260909-v1";
var SODOBA_DYNAMIC_CACHE_TTL_SECONDS = 15;
var SODOBA_MASTER_MENU_CACHE_TTL_SECONDS = 300;
var SODOBA_CACHE_REVISION_PROPERTY = "SODOBA_DYNAMIC_CACHE_REVISION";
var SODOBA_MASTER_CACHE_REVISION_PROPERTY = "SODOBA_MASTER_MENU_CACHE_REVISION";

function isForceRefreshGS(value) {
  if (value === true) return true;
  var normalized = (value || "").toString().trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function getSodobaCacheRevision(domain) {
  try {
    var propertyName = domain === "master_menu"
      ? SODOBA_MASTER_CACHE_REVISION_PROPERTY
      : SODOBA_CACHE_REVISION_PROPERTY;
    return PropertiesService.getScriptProperties().getProperty(propertyName) || "0";
  } catch (err) {
    return "0";
  }
}

function getSodobaCacheKey(domain, scope) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    (scope || "all").toString(),
    Utilities.Charset.UTF_8
  );
  var hash = digest.map(function(value) {
    return ("0" + ((value + 256) % 256).toString(16)).slice(-2);
  }).join("").slice(0, 32);
  return [SODOBA_CACHE_SCHEMA, domain, getSodobaCacheRevision(domain), hash].join(":");
}

function getSodobaCachedJson(domain, scope, forceRefresh) {
  if (forceRefresh) return null;
  try {
    var cached = CacheService.getScriptCache().get(getSodobaCacheKey(domain, scope));
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    return null;
  }
}

function putSodobaCachedJson(domain, scope, value, ttlSeconds) {
  try {
    var serialized = JSON.stringify(value);
    // CacheService giới hạn 100 KB mỗi key; bỏ qua cache nếu payload quá lớn.
    if (Utilities.newBlob(serialized).getBytes().length > 95000) return;
    CacheService.getScriptCache().put(
      getSodobaCacheKey(domain, scope),
      serialized,
      ttlSeconds
    );
  } catch (err) {
    // Cache chỉ là lớp tăng tốc; lỗi cache không được phép làm hỏng nghiệp vụ.
  }
}

function invalidateSodobaDynamicCache() {
  try {
    PropertiesService.getScriptProperties().setProperty(
      SODOBA_CACHE_REVISION_PROPERTY,
      new Date().getTime().toString() + "-" + Math.floor(Math.random() * 1000000)
    );
  } catch (err) {
    // TTL 15 giây vẫn bảo đảm dữ liệu tự hết hạn nếu PropertiesService tạm lỗi.
  }
}

function invalidateSodobaMasterMenuCache() {
  try {
    PropertiesService.getScriptProperties().setProperty(
      SODOBA_MASTER_CACHE_REVISION_PROPERTY,
      new Date().getTime().toString() + "-" + Math.floor(Math.random() * 1000000)
    );
  } catch (err) {}
}

// ============================================================================
// 1. HÀM ĐỌC DỮ LIỆU DÀNH CHO MINI APP SODOBA (GET REQUEST)
// ============================================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action ? params.action.toString().toUpperCase() : "";
    var forceRefresh = isForceRefreshGS(params.force_refresh);

    // 1.1 LẤY DANH SÁCH MÓN ĂN THEO ĐƠN TỪ TAB DATMON
    if (action === "GET_MENUS" || (action === "" && params.id_dat && !params.date)) {
      var idDat = params.id_dat;
      var menuScope = "booking:" + (idDat || "").toString().trim().toUpperCase();
      var cachedMenus = getSodobaCachedJson("datmon", menuScope, forceRefresh);
      if (cachedMenus !== null) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: cachedMenus, cache_hit: true })).setMimeType(ContentService.MimeType.JSON);
      }
      var menus = getActiveMenusForBooking(ss, idDat);
      putSodobaCachedJson("datmon", menuScope, menus, SODOBA_DYNAMIC_CACHE_TTL_SECONDS);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: menus,
        cache_hit: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.2 LẤY TOÀN BỘ MÓN ĂN ĐÃ ĐẶT TỪ TAB DATMON
    if (action === "GET_ALL_DATMON" || action === "GET_ALL_MENUS") {
      var datMonDate = params.date || "ALL";
      var datMonIds = params.id_dats || params.ids || "";
      var datMonScope = "date:" + datMonDate + "|ids:" + datMonIds;
      var cachedAllMenus = getSodobaCachedJson("datmon", datMonScope, forceRefresh);
      if (cachedAllMenus !== null) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: cachedAllMenus, cache_hit: true })).setMimeType(ContentService.MimeType.JSON);
      }
      var allMenus = getAllActiveMenusFromDatMon(ss, { date: datMonDate, idDats: datMonIds });
      putSodobaCachedJson("datmon", datMonScope, allMenus, SODOBA_DYNAMIC_CACHE_TTL_SECONDS);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: allMenus,
        cache_hit: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.3 LẤY DANH MỤC MÓN ĂN TỪ TAB MENU_MON
    if (action === "GET_MENU_MON" || action === "GET_CONFIG_MON") {
      var cachedMasterMenus = getSodobaCachedJson("master_menu", "all", forceRefresh);
      if (cachedMasterMenus !== null) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: cachedMasterMenus, cache_hit: true })).setMimeType(ContentService.MimeType.JSON);
      }
      var masterMenus = getMasterMenusFromSheet(ss);
      putSodobaCachedJson("master_menu", "all", masterMenus, SODOBA_MASTER_MENU_CACHE_TTL_SECONDS);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: masterMenus,
        cache_hit: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.4 LẤY TOÀN BỘ DANH SÁCH ĐẶT BÀN
    if (action === "GET_BOOKINGS") {
      var bookingDate = params.date || "ALL";
      var bookingScope = "date:" + bookingDate;
      var cachedBookings = getSodobaCachedJson("bookings", bookingScope, forceRefresh);
      if (cachedBookings !== null) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", data: cachedBookings, bookings: cachedBookings, cache_hit: true })).setMimeType(ContentService.MimeType.JSON);
      }
      var allBookings = getAllBookingsList(ss, bookingDate);
      putSodobaCachedJson("bookings", bookingScope, allBookings, SODOBA_DYNAMIC_CACHE_TTL_SECONDS);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: allBookings,
        bookings: allBookings,
        cache_hit: false
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.4.1 CẬP NHẬT HOẶC ĐỌC DỮ LIỆU VIEW_HOMNAY VÀ VIEW_BEP_HOMNAY
    if (action === "UPDATE_VIEWS" || action === "SYNC_VIEWS" || action === "GET_VIEWS") {
      var viewsResult = updateAllViewsToday(ss);
      return ContentService.createTextOutput(JSON.stringify(viewsResult)).setMimeType(ContentService.MimeType.JSON);
    }

    // 1.5 CÔNG CỤ CHẨN ĐOÁN DỮ LIỆU N8N
    if (action === "DIAGNOSE_N8N" || action === "DEBUG_DATBAN") {
      return handleDiagnoseN8n(ss, e);
    }

    // 1.6 MẶC ĐỊNH: ĐỌC BẢN ĐỒ TRẠNG THÁI BÀN & THÔNG TIN ĐẶT BÀN
    var statusMap = {};
    var detailsMap = {};
    var bookingsList = [];
    var seenBookingIds = {};

    var now = new Date();
    var targetDateStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");

    // Lấy ngày từ Tham số Query 'date' (Hỗ trợ định dạng dd/MM/yyyy, yyyy-MM-dd)
    if (params.date) {
      var paramDate = params.date.toString().trim();
      if (paramDate.indexOf("-") !== -1 && paramDate.split("-")[0].length === 4) {
        var parts = paramDate.split("-");
        targetDateStr = parts[2] + "/" + parts[1] + "/" + parts[0];
      } else {
        targetDateStr = paramDate;
      }
    }

    var combinedScope = "date:" + targetDateStr;
    var cachedCombined = getSodobaCachedJson("floor_and_bookings", combinedScope, forceRefresh);
    if (cachedCombined !== null) {
      cachedCombined.cache_hit = true;
      return ContentService.createTextOutput(JSON.stringify(cachedCombined)).setMimeType(ContentService.MimeType.JSON);
    }

    // A. ĐỌC TRẠNG THÁI KHÓA CỐ ĐỊNH TỪ CONFIG_BAN
    var configSheet = ss.getSheetByName("CONFIG_BAN");
    if (configSheet) {
      var configData = configSheet.getDataRange().getValues();
      for (var i = 1; i < configData.length; i++) {
        var maBan = configData[i][1]; // Cột B
        var trangThaiConfig = configData[i][7] ? configData[i][7].toString().trim().toUpperCase() : ""; // Cột H
        
        if (maBan && (trangThaiConfig === "BLOCK" || trangThaiConfig === "KHÓA" || trangThaiConfig === "INACTIVE")) {
          var cleanB = cleanTableCode(maBan.toString());
          if (cleanB) {
            assignTableStatusBothKeys(statusMap, cleanB, "inactive");
            var lockDetail = {
              id_dat: "N/A",
              ten_khach: "BÀN ĐANG KHÓA",
              sdt: "-",
              ngay_dat: targetDateStr,
              gio_dat: "-",
              so_khach: 0,
              tien_coc: 0,
              trang_thai: "KHÓA BẢO TRÌ",
              ghi_chu: "Khóa bảo trì trên hệ thống CONFIG_BAN",
              is_lock: true
            };
            assignTableDetailBothKeys(detailsMap, cleanB, lockDetail);
          }
        }
      }
    }

    // B. ĐỌC TRẠNG THÁI ĐẶT BÀN THEO NGÀY TỪ BẢNG DATBAN
    var sheet = getSheetByNameRobust(ss, "DATBAN");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      var displayData = sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        var ngayDatRaw = data[i][1]; // Cột B
        if (!ngayDatRaw) continue;
        
        // So khớp ngày thông minh (khắc phục triệt để lỗi parse ngày JS)
        var isDateMatched = areDatesMatchingGS(ngayDatRaw, targetDateStr);
        if (!isDateMatched) continue;

        var banListRaw = data[i][6] ? data[i][6].toString() : ""; // Cột G
        var trangThaiRaw = data[i][11] ? data[i][11].toString().trim().toUpperCase() : ""; // Cột L
        
        var statusClass = "";
        if (trangThaiRaw === "ĐÃ ĐẶT" || trangThaiRaw === "DAT") {
          statusClass = "booked";
        } else if (trangThaiRaw === "ĐÃ XÁC NHẬN" || trangThaiRaw === "XÁC NHẬN" || trangThaiRaw === "CONFIRMED") {
          statusClass = "confirmed";
        } else if (trangThaiRaw === "ĐÃ ĐẾN" || trangThaiRaw === "DEN" || trangThaiRaw === "ARRIVED") {
          statusClass = "arrived";
        } else if (trangThaiRaw === "NO-SHOW" || trangThaiRaw === "NOSHOW" || trangThaiRaw === "KHÓA") {
          statusClass = "inactive";
        } else if (trangThaiRaw === "HỦY" || trangThaiRaw === "HUY" || trangThaiRaw === "CANCEL") {
          statusClass = "empty";
        }

        // Tách danh sách bàn linh hoạt và định dạng chuẩn B01, B02, B54...
        var formattedBanList = formatBanListString(banListRaw);
        var bans = splitTableListGS(banListRaw);
        var bansFormatted = formattedBanList ? formattedBanList.split(", ") : bans;

        // Chuẩn hóa giờ đặt sang HH:mm độc lập múi giờ (tránh triệt để lỗi 19h biến thành 10:06 AM)
        var gioDatRaw = data[i][2]; // Cột C
        var dispGioDat = (displayData && displayData[i]) ? displayData[i][2] : null;
        var gioDatStr = formatTimeCellGS(gioDatRaw, dispGioDat);

        var idDatStr = data[i][0] ? data[i][0].toString().trim() : ("N8N-R" + (i + 1));
        var ngayDatDisplay = formatDateCellDisplay(ngayDatRaw);

        var bookingDetail = {
          id_dat: idDatStr,
          ngay_dat: ngayDatDisplay,
          gio_dat: gioDatStr,
          ten_khach: data[i][3] ? data[i][3].toString() : "",
          sdt: data[i][4] ? data[i][4].toString() : "",
          so_khach: Number(data[i][5]) || 0,
          danh_sach_ban: bansFormatted,
          danh_sach_ban_raw: banListRaw,
          yeu_cau_ban: data[i][7] ? data[i][7].toString() : "",
          dat_mon_truoc: data[i][8] ? data[i][8].toString() : "Không",
          dat_coc: data[i][9] ? data[i][9].toString() : "",
          tien_coc: Number(data[i][10]) || 0,
          trang_thai: data[i][11] ? data[i][11].toString() : "ĐÃ ĐẶT",
          nguoi_nhap: data[i][12] ? data[i][12].toString() : "",
          thoi_gian_nhap: data[i][13] ? (data[i][13] instanceof Date ? Utilities.formatDate(data[i][13], "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss") : data[i][13].toString()) : "",
          ghi_chu: data[i][14] ? data[i][14].toString() : "",
          is_lock: (trangThaiRaw === "NO-SHOW" || data[i][3] === "KHÓA BÀN")
        };

        if (idDatStr && !seenBookingIds[idDatStr]) {
          seenBookingIds[idDatStr] = true;
          bookingsList.push(bookingDetail);
        }

        // Cập nhật trạng thái từng bàn
        for (var bIdx = 0; bIdx < bans.length; bIdx++) {
          var cleanB = bans[bIdx];
          if (!cleanB) continue;

          if (statusClass && statusClass !== "empty") {
            assignTableStatusBothKeys(statusMap, cleanB, statusClass);
            assignTableDetailBothKeys(detailsMap, cleanB, bookingDetail);
          } else if (statusClass === "empty") {
            // Khi đơn bị HỦY (hoặc mở khóa bàn): Xóa trạng thái để bàn trở về Trống (Màu vàng)
            deleteTableStatusBothKeys(statusMap, cleanB);
            deleteTableDetailBothKeys(detailsMap, cleanB);
          }
        }
      }
    }

    // Kết quả trả về: Gồm statusMap, detailsMap, bookings
    // ĐẶC BIỆT: Gộp phẳng các key bàn ra ngoài cùng để index.html cũ đọc trực tiếp được!
    var responseObj = {
      status: "success",
      statusMap: statusMap,
      detailsMap: detailsMap,
      bookings: bookingsList,
      cache_hit: false
    };

    // Flatten keys bàn cho index.html cũ: Object.keys(currentStatusMap)
    for (var k in statusMap) {
      if (statusMap.hasOwnProperty(k)) {
        responseObj[k] = statusMap[k];
      }
    }

    putSodobaCachedJson("floor_and_bookings", combinedScope, responseObj, SODOBA_DYNAMIC_CACHE_TTL_SECONDS);

    return ContentService.createTextOutput(JSON.stringify(responseObj)).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2. HÀM GHI & CẬP NHẬT DỮ LIỆU (POST REQUEST)
// ============================================================================
function mutationJsonOutput(ss, data, result) {
  var viewsDeferred = Boolean(data && data.defer_views === true);
  if (!viewsDeferred) {
    syncAllViewsSafely(ss);
  }
  if (result && (result.status || "").toString().toLowerCase() === "success") {
    invalidateSodobaDynamicCache();
  }
  result.views_deferred = viewsDeferred;
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var now = new Date();
    var todayStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
    var timeStampStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    var banFormatted = formatBanListString(data.danh_sach_ban);
    var reqTables = (Array.isArray(data.danh_sach_ban) ? data.danh_sach_ban : (data.danh_sach_ban || "").toString().split(/[,;\s]+/))
                    .map(cleanTableCode).filter(Boolean);

    var sheet = getSheetByNameRobust(ss, "DATBAN");

    // ------------------------------------------------------------------------
    // 2.1 CẬP NHẬT TRẠNG THÁI (UPDATE_STATUS: Xác nhận, Đã đến, Hủy bàn, Mở khóa)
    // ------------------------------------------------------------------------
    if (data.action === "UPDATE_STATUS") {
      var isUnlocking = (data.trang_thai === "HỦY" || data.trang_thai === "MỞ KHÓA" || data.trang_thai === "ĐÃ VỀ");
      if (isUnlocking) {
        updateConfigBanStatus(reqTables, "ACTIVE");
      }

      var rows = sheet.getDataRange().getValues();
      var updatedCount = 0;
      var targetDate = data.ngay_dat ? formatDateVN(data.ngay_dat) : todayStr;
      var statusRanges = [];
      var timestampRanges = [];

      for (var i = rows.length - 1; i >= 1; i--) {
        var ngayDatRaw = rows[i][1]; // Cột B
        if (!ngayDatRaw) continue;
        
        var isMatchDate = areDatesMatchingGS(ngayDatRaw, targetDate);
        if (isMatchDate) {
          var banInSheetStr = rows[i][6] ? rows[i][6].toString() : ""; // Cột G
          var tablesInRow = splitTableListGS(banInSheetStr);

          var hasMatch = reqTables.some(function(rt) {
            return tablesInRow.indexOf(rt) !== -1;
          });

          if (hasMatch) {
            statusRanges.push("L" + (i + 1));
            timestampRanges.push("N" + (i + 1));
            updatedCount++;
          }
        }
      }

      if (statusRanges.length > 0) {
        sheet.getRangeList(statusRanges).setValue(data.trang_thai);
        sheet.getRangeList(timestampRanges).setValue(timeStampStr);
      }
      return mutationJsonOutput(ss, data, {
        status: "success",
        message: updatedCount > 0 ? "Cập nhật thành công" : "Đã cập nhật CONFIG_BAN",
        updatedCount: updatedCount
      });
    }

    // ------------------------------------------------------------------------
    // 2.2 SỬA THÔNG TIN ĐƠN ĐẶT BÀN (UPDATE_BOOKING_INFO / UPDATE_BOOKING)
    // ------------------------------------------------------------------------
    if (data.action === "UPDATE_BOOKING_INFO" || data.action === "UPDATE_BOOKING") {
      var rows = sheet.getDataRange().getValues();
      var foundIndex = -1;
      var targetId = data.id_dat || (data.booking ? data.booking.id_dat : "");

      for (var i = 1; i < rows.length; i++) {
        var rowId = rows[i][0] ? rows[i][0].toString().trim() : "";
        if (rowId === targetId) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex !== -1) {
        var payload = data.booking || data;
        var updatedRow = rows[foundIndex - 1].slice(0, 15);
        while (updatedRow.length < 15) updatedRow.push("");
        if (payload.ten_khach !== undefined) updatedRow[3] = payload.ten_khach;
        if (payload.sdt !== undefined) updatedRow[4] = payload.sdt;
        if (payload.so_khach !== undefined) updatedRow[5] = parseInt(payload.so_khach) || 0;
        if (payload.gio_dat !== undefined) updatedRow[2] = payload.gio_dat;
        if (payload.ngay_dat !== undefined) updatedRow[1] = formatDateVN(payload.ngay_dat);
        if (payload.tien_coc !== undefined) {
          var tc = Number(payload.tien_coc) || 0;
          updatedRow[10] = tc > 0 ? tc : "";
          updatedRow[9] = tc > 0 ? "Đã cọc" : "Chưa";
        }
        if (payload.danh_sach_ban !== undefined) {
          var newBanStr = formatBanListString(payload.danh_sach_ban);
          updatedRow[6] = newBanStr;
        }
        if (payload.trang_thai !== undefined) updatedRow[11] = payload.trang_thai;
        if (payload.ghi_chu !== undefined) updatedRow[14] = payload.ghi_chu;
        if (payload.nguoi_nhap !== undefined) updatedRow[12] = payload.nguoi_nhap;
        updatedRow[13] = timeStampStr;
        sheet.getRange(foundIndex, 1, 1, 15).setValues([updatedRow]);
        if (payload.danh_sach_ban !== undefined) updateDatMonTableList(ss, targetId, newBanStr);

        return mutationJsonOutput(ss, data, {
          status: "success", message: "Cập nhật thông tin thành công"
        });
      } else {
        return ContentService.createTextOutput(JSON.stringify({
          status: "not_found", message: "Không tìm thấy mã đơn đặt bàn: " + targetId
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ------------------------------------------------------------------------
    // 2.3 KHÓA / MỞ KHÓA BÀN (LOCK / UNLOCK)
    // ------------------------------------------------------------------------
    if (data.action === "LOCK" || data.action === "UNLOCK") {
      var isUnlock = (data.action === "UNLOCK" || data.unlock === true);

      if (isUnlock) {
        updateConfigBanStatus(reqTables, "ACTIVE");
        var rows = sheet.getDataRange().getValues();
        var unlockStatusRanges = [];
        var unlockTimestampRanges = [];
        for (var i = rows.length - 1; i >= 1; i--) {
          var trangThaiRow = rows[i][11] ? rows[i][11].toString().trim().toUpperCase() : "";
          if (trangThaiRow === "NO-SHOW" || trangThaiRow === "KHÓA") {
            var tablesInRow = splitTableListGS(rows[i][6] ? rows[i][6].toString() : "");
            var hasMatch = reqTables.some(function(rt) { return tablesInRow.indexOf(rt) !== -1; });
            if (hasMatch) {
              unlockStatusRanges.push("L" + (i + 1));
              unlockTimestampRanges.push("N" + (i + 1));
            }
          }
        }
        if (unlockStatusRanges.length > 0) {
          sheet.getRangeList(unlockStatusRanges).setValue("HỦY");
          sheet.getRangeList(unlockTimestampRanges).setValue(timeStampStr);
        }
        return mutationJsonOutput(ss, data, {
          status: "success", message: "Đã mở khóa bàn"
        });
      }

      // Khóa bàn: Ghi BLOCK vào CONFIG_BAN và thêm dòng NO-SHOW vào DATBAN
      updateConfigBanStatus(reqTables, "BLOCK");
      var todayIdStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd");
      var rows = sheet.getDataRange().getValues();
      var countToday = 1;
      for (var i = 1; i < rows.length; i++) {
        var idCell = rows[i][0] ? rows[i][0].toString() : "";
        if (idCell.indexOf("S8-" + todayIdStr) !== -1) {
          countToday++;
        }
      }
      var suffix = ("00" + countToday).slice(-3);
      var newLockId = "S8-" + todayIdStr + "-" + suffix;
      var ngayDatLock = data.ngay_dat ? formatDateVN(data.ngay_dat) : todayStr;

      sheet.appendRow([
        newLockId,
        ngayDatLock,
        "00:00",
        "KHÓA BÀN",
        "",
        0,
        banFormatted,
        "KHÓA",
        "Không",
        "Chưa",
        "",
        "NO-SHOW",
        data.nguoi_nhap || "Chủ SMO",
        timeStampStr,
        data.ghi_chu || "Khóa bàn qua Mini App"
      ]);

      return mutationJsonOutput(ss, data, {
        status: "success", id: newLockId, ban: banFormatted, trang_thai: "NO-SHOW"
      });
    }

    // ------------------------------------------------------------------------
    // 2.4 DỜI BÀN (MOVE_TABLE)
    // ------------------------------------------------------------------------
    if (data.action === "MOVE_TABLE") {
      var idDat = data.id_dat;
      var newTablesRaw = data.new_tables || [];
      var newBanStr = formatBanListString(newTablesRaw);

      var rows = sheet.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString().trim() === idDat) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow !== -1) {
        var oldBanStr = rows[foundRow - 1][6] ? rows[foundRow - 1][6].toString() : "";
        sheet.getRange(foundRow, 7).setValue(newBanStr);
        sheet.getRange(foundRow, 14).setValue(timeStampStr);
        var oldGhiChu = rows[foundRow - 1][14] ? rows[foundRow - 1][14].toString() : "";
        var moveNote = "Dời từ [" + oldBanStr + "] sang [" + newBanStr + "] lúc " + timeStampStr;
        sheet.getRange(foundRow, 15).setValue(oldGhiChu ? (oldGhiChu + " | " + moveNote) : moveNote);
        updateDatMonTableList(ss, idDat, newBanStr);

        return mutationJsonOutput(ss, data, {
          status: "success", message: "Đã dời bàn thành công", new_ban: newBanStr
        });
      }
    }

    // ------------------------------------------------------------------------
    // 2.5 GHÉP BÀN / NỐI BÀN (LINK_TABLE)
    // ------------------------------------------------------------------------
    if (data.action === "LINK_TABLE") {
      var idDat = data.id_dat;
      var addedTablesRaw = data.added_tables || [];
      var rows = sheet.getDataRange().getValues();
      var foundRow = -1;

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString().trim() === idDat) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow !== -1) {
        var currentBanStr = rows[foundRow - 1][6] ? rows[foundRow - 1][6].toString() : "";
        var currentTables = splitTableListGS(currentBanStr);
        var combinedTables = Array.from(new Set(currentTables.concat(addedTablesRaw.map(cleanTableCode))));
        var combinedBanStr = formatBanListString(combinedTables);

        sheet.getRange(foundRow, 7).setValue(combinedBanStr);
        sheet.getRange(foundRow, 14).setValue(timeStampStr);
        updateDatMonTableList(ss, idDat, combinedBanStr);

        return mutationJsonOutput(ss, data, {
          status: "success", message: "Đã ghép thêm bàn thành công", danh_sach_ban: combinedBanStr
        });
      }
    }

    // ------------------------------------------------------------------------
    // 2.6 QUẢN LÝ ĐẶT MÓN (ADD_MENU, UPDATE_MENU, DELETE_MENU, GET_MENUS, GET_ALL_DATMON, GET_CONFIG_MON)
    // ------------------------------------------------------------------------
    var reqAction = (data.action || "").toString().trim().toUpperCase();

    if (reqAction === "ADD_MENU") {
      var addResult = handleAddMenuGS(ss, data);
      return mutationJsonOutput(ss, data, addResult);
    }
    if (reqAction === "UPDATE_MENU") {
      var updateResult = handleUpdateMenuGS(ss, data);
      return mutationJsonOutput(ss, data, updateResult);
    }
    if (reqAction === "DELETE_MENU") {
      var deleteResult = handleDeleteMenuGS(ss, data);
      return mutationJsonOutput(ss, data, deleteResult);
    }
    // Hỗ trợ đọc danh sách món qua POST để tránh lỗi nếu client gửi POST
    if (reqAction === "GET_MENUS") {
      var menus = getActiveMenusForBooking(ss, data.id_dat);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: menus
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (reqAction === "GET_ALL_DATMON" || reqAction === "GET_ALL_MENUS") {
      var allMenus = getAllActiveMenusFromDatMon(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: allMenus
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (reqAction === "GET_CONFIG_MON" || reqAction === "GET_MENU_MON") {
      var configMenus = getMasterMenusFromSheet(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: configMenus
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------------------
    // 2.7 TẠO ĐƠN ĐẶT BÀN MỚI (BOOK)
    // CHỈ TẠO KHI ACTION CHÍNH XÁC LÀ "BOOK".
    // TUYỆT ĐỐI KHÔNG TỰ ĐỘNG THÊM DÒNG VÀO DATBAN NẾU LÀ THAO TÁC KHÁC HOẶC TẢI LẠI!
    // ------------------------------------------------------------------------
    if (reqAction === "BOOK") {
      var todayIdStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd");
      var rows = sheet.getDataRange().getValues();
      var countToday = 1;
      for (var i = 1; i < rows.length; i++) {
        var idCell = rows[i][0] ? rows[i][0].toString() : "";
        if (idCell.indexOf("S8-" + todayIdStr) !== -1) {
          countToday++;
        }
      }
      var suffix = ("00" + countToday).slice(-3);
      var newId = "S8-" + todayIdStr + "-" + suffix;
      
      var ngayDat = data.ngay_dat ? formatDateVN(data.ngay_dat) : todayStr;
      var gioDat = formatTimeCellGS(data.gio_dat) || "18:00";
      var tenKhach = data.ten_khach || "Khách Lẻ";
      var sdt = data.sdt || "";
      var soKhach = parseInt(data.so_khach) || 2;
      var yeuCauBan = data.yeu_cau_ban || (reqTables.length > 1 ? "TỰ ĐỘNG (GHÉP)" : "TỰ ĐỘNG");
      var datMonTruoc = data.dat_mon_truoc || "Không";
      var tienCoc = data.tien_coc ? Number(data.tien_coc) : "";
      var datCoc = (tienCoc > 0) ? "Đã cọc" : "Chưa";
      var trangThai = data.trang_thai || "ĐÃ ĐẶT";
      var nguoiNhap = data.nguoi_nhap || "Chủ SMO";
      var ghiChu = data.ghi_chu || "";
      
      // Ghi chính xác 15 cột theo cấu trúc chuẩn
      sheet.appendRow([
        newId, ngayDat, gioDat, tenKhach, sdt, soKhach, banFormatted, 
        yeuCauBan, datMonTruoc, datCoc, tienCoc, trangThai, nguoiNhap, timeStampStr, ghiChu
      ]);
      
      return mutationJsonOutput(ss, data, {
        status: "success", id: newId, id_dat: newId, ban: banFormatted, trang_thai: trangThai 
      });
    }

    // 2.8 ĐỒNG BỘ VÀ TẠO TAB VIEW_HOMNAY & VIEW_BEP_HOMNAY
    if (reqAction === "UPDATE_VIEWS" || reqAction === "SYNC_VIEWS") {
      var viewsRes = updateAllViewsToday(ss);
      return ContentService.createTextOutput(JSON.stringify(viewsRes)).setMimeType(ContentService.MimeType.JSON);
    }

    // Nếu không khớp bất kỳ action nào, TRẢ VỀ LỖI, TUYỆT ĐỐI KHÔNG TỰ Ý APPEND VÀO DATBAN
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hành động không xác định hoặc dữ liệu không hợp lệ: " + (data.action || "Trống")
    })).setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 3. CÁC HÀM TIỆN ÍCH CHUẨN HÓA DỮ LIỆU & MATCHING VỚI GOOGLE SHEETS
// ============================================================================

/**
 * Tìm Sheet linh hoạt không phân biệt hoa thường và khoảng trắng dư thừa
 */
function getSheetByNameRobust(ss, targetName) {
  if (!ss || !targetName) return null;
  var exact = ss.getSheetByName(targetName);
  if (exact) return exact;
  var sheets = ss.getSheets();
  var normalizedTarget = targetName.toString().toUpperCase().replace(/[\s_\-]/g, '');
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toUpperCase().replace(/[\s_\-]/g, '');
    if (name === normalizedTarget) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * Định dạng chuỗi danh sách bàn lưu vào sheet (B01, B02, B54, VIP1, VIP2, B70...)
 * Khớp chuẩn hiển thị trên Google Sheet của bạn
 */
function formatBanListString(banInput) {
  if (!banInput) return "";
  var list = Array.isArray(banInput) ? banInput : banInput.toString().split(/[,;+\/\s-]+/);
  var formatted = list.map(function(item) {
    if (!item) return "";
    var clean = item.toString().trim().toUpperCase();
    clean = clean.replace(/[\[\]"'\\]/g, '').trim();
    clean = clean.replace(/^BÀN\s*/i, '').replace(/^BAN\s*/i, '').replace(/^PHÒNG\s*/i, '').replace(/^PHONG\s*/i, '').replace(/^TABLE\s*/i, '').trim();

    if (clean === "2A" || clean === "VIP1" || clean === "VIP 1" || clean === "LẦU 2A" || clean === "LAU 2A") return "VIP1";
    if (clean === "2B" || clean === "VIP2" || clean === "VIP 2" || clean === "LẦU 2B" || clean === "LAU 2B") return "VIP2";

    var matchVip = clean.match(/^(?:VIP\s*|B)?(70|72|74|76)$/i);
    if (matchVip) return "B" + matchVip[1];

    if (/^B0*(\d+)$/i.test(clean)) {
      var matchB = clean.match(/^B0*(\d+)$/i);
      var num = parseInt(matchB[1], 10);
      if (num === 70 || num === 72 || num === 74 || num === 76) return "B" + num;
      return "B" + ("0" + num).slice(-2);
    }

    if (/^\d+$/.test(clean)) {
      var n = parseInt(clean, 10);
      if (n === 70 || n === 72 || n === 74 || n === 76) return "B" + n;
      return "B" + ("0" + n).slice(-2);
    }
    return clean;
  }).filter(Boolean);
  return formatted.join(", ");
}

/**
 * Chuẩn hóa mã bàn thành ID định danh trong hệ thống (1..64, 70..76, VIP1, VIP2)
 */
function cleanTableCode(b) {
  if (!b) return "";
  var cleanB = b.toString().toUpperCase().trim();
  // Bóc tách ngoặc vuông, nháy kép từ mảng JSON do n8n ghi
  cleanB = cleanB.replace(/[\[\]"'\\]/g, '').trim();
  cleanB = cleanB.replace(/^BÀN\s*/i, '').replace(/^BAN\s*/i, '').replace(/^PHÒNG\s*/i, '').replace(/^PHONG\s*/i, '').replace(/^TABLE\s*/i, '').trim();

  if (cleanB.indexOf("2A") !== -1 || cleanB === "VIP1" || cleanB === "VIP 1" || cleanB === "LẦU 2A" || cleanB === "LAU 2A") return "VIP1";
  if (cleanB.indexOf("2B") !== -1 || cleanB === "VIP2" || cleanB === "VIP 2" || cleanB === "LẦU 2B" || cleanB === "LAU 2B") return "VIP2";

  // Bàn số dạng B01 -> 1, B54 -> 54
  if (/^B0*(\d+)$/.test(cleanB)) {
    var num = parseInt(cleanB.replace('B', ''), 10);
    return num.toString();
  }
  // Bàn số thuần túy 01 -> 1, 54 -> 54
  if (/^0*(\d+)$/.test(cleanB)) {
    var num2 = parseInt(cleanB, 10);
    return num2.toString();
  }
  return cleanB;
}

/**
 * Tách chuỗi danh sách bàn thành mảng mã bàn đã chuẩn hóa
 */
function splitTableListGS(banInput) {
  if (!banInput) return [];
  if (Array.isArray(banInput)) {
    var res = [];
    for (var i = 0; i < banInput.length; i++) {
      var sub = splitTableListGS(banInput[i]);
      res = res.concat(sub);
    }
    return res;
  }
  var str = banInput.toString().trim();
  if (str.indexOf("[") === 0 && str.lastIndexOf("]") === str.length - 1) {
    try {
      var parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return splitTableListGS(parsed);
      }
    } catch (e) {
      str = str.replace(/[\[\]]/g, '');
    }
  }
  var rawArr = str.split(/[,;+\/\s-]+/);
  var out = [];
  for (var j = 0; j < rawArr.length; j++) {
    var code = cleanTableCode(rawArr[j]);
    if (code) out.push(code);
  }
  return out;
}

/**
 * Gán trạng thái bàn vào map cho cả key ngắn gọn (54) và key chuẩn (B54, VIP70)
 * Giúp cả index.html và Web App mới đều khớp 100%
 */
function assignTableStatusBothKeys(map, cleanCode, status) {
  if (!cleanCode) return;
  map[cleanCode] = status;

  // Nếu là bàn số thông thường (1..64)
  if (/^\d+$/.test(cleanCode)) {
    var bPrefixed = "B" + ("0" + cleanCode).slice(-2);
    map[bPrefixed] = status;

    // Các phòng VIP lầu 1: 70, 72, 74, 76
    var num = parseInt(cleanCode, 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      map["VIP" + num] = status;
    }
  }

  // Nếu là VIP1 / 2A
  if (cleanCode === "VIP1") {
    map["2A"] = status;
  }
  // Nếu là VIP2 / 2B
  if (cleanCode === "VIP2") {
    map["2B"] = status;
  }
}

function deleteTableStatusBothKeys(map, cleanCode) {
  if (!cleanCode) return;
  delete map[cleanCode];
  if (/^\d+$/.test(cleanCode)) {
    delete map["B" + ("0" + cleanCode).slice(-2)];
    var num = parseInt(cleanCode, 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      delete map["VIP" + num];
    }
  }
  if (cleanCode === "VIP1") delete map["2A"];
  if (cleanCode === "VIP2") delete map["2B"];
}

function assignTableDetailBothKeys(map, cleanCode, detail) {
  if (!cleanCode) return;
  map[cleanCode] = detail;
  if (/^\d+$/.test(cleanCode)) {
    map["B" + ("0" + cleanCode).slice(-2)] = detail;
    var num = parseInt(cleanCode, 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      map["VIP" + num] = detail;
    }
  }
  if (cleanCode === "VIP1") map["2A"] = detail;
  if (cleanCode === "VIP2") map["2B"] = detail;
}

function deleteTableDetailBothKeys(map, cleanCode) {
  if (!cleanCode) return;
  delete map[cleanCode];
  if (/^\d+$/.test(cleanCode)) {
    delete map["B" + ("0" + cleanCode).slice(-2)];
    var num = parseInt(cleanCode, 10);
    if (num === 70 || num === 72 || num === 74 || num === 76) {
      delete map["VIP" + num];
    }
  }
  if (cleanCode === "VIP1") delete map["2A"];
  if (cleanCode === "VIP2") delete map["2B"];
}

/**
 * Trích xuất ngày, tháng, năm độc lập múi giờ (chuẩn múi giờ VN Asia/Ho_Chi_Minh)
 * Giải quyết dứt điểm lỗi new Date("05/09/2026") bị đảo thành ngày 9 tháng 5
 */
function parseDatePartsGS(val) {
  if (!val) return null;
  if (val instanceof Date) {
    var dStr = Utilities.formatDate(val, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    var dParts = dStr.split("-");
    return { d: parseInt(dParts[2], 10), m: parseInt(dParts[1], 10), y: parseInt(dParts[0], 10) };
  }
  var str = val.toString().trim();
  str = str.replace(/T.*$/, '').split(" ")[0].trim();
  var parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return { d: parseInt(parts[2], 10), m: parseInt(parts[1], 10), y: parseInt(parts[0], 10) };
    } else {
      // DD/MM/YYYY
      return { d: parseInt(parts[0], 10), m: parseInt(parts[1], 10), y: parseInt(parts[2], 10) };
    }
  }
  return null;
}

/**
 * So sánh 2 giá trị ngày xem có trùng khớp không
 */
function areDatesMatchingGS(sheetDateVal, targetDateStr) {
  if (!sheetDateVal || !targetDateStr) return false;
  if (targetDateStr === "ALL") return true;
  var pSheet = parseDatePartsGS(sheetDateVal);
  var pTarget = parseDatePartsGS(targetDateStr);
  if (!pSheet || !pTarget) return false;
  return pSheet.d === pTarget.d && pSheet.m === pTarget.m && pSheet.y === pTarget.y;
}

/**
 * Kiểm tra xem một ô ngày trong Sheet có khớp với ngày hiện tại (múi giờ Việt Nam) hay không
 * Hỗ trợ: Date object, Google Sheets serial number (ví dụ 45541), chuỗi dd/MM/yyyy, yyyy-MM-dd, ISO string
 * Fallback: nếu ô ngày trống, tự động đối chiếu mã id_dat (chứa yyyyMMdd)
 */
function isDateMatchingTodayGS(sheetDateVal, idDat) {
  var now = new Date();
  var todayVN = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
  var todayISO = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
  var todayCompact = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd");
  var todayD = parseInt(Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd"), 10);
  var todayM = parseInt(Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "MM"), 10);
  var todayY = parseInt(Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyy"), 10);

  if (sheetDateVal !== null && sheetDateVal !== undefined && sheetDateVal !== "") {
    // 1. Date object
    if (Object.prototype.toString.call(sheetDateVal) === '[object Date]' || sheetDateVal instanceof Date) {
      try {
        var dVN = Utilities.formatDate(sheetDateVal, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
        if (dVN === todayVN) return true;
      } catch (e) {}
    }

    // 2. Serial number của Google Sheets (ví dụ 45541)
    if (typeof sheetDateVal === "number" && sheetDateVal > 30000 && sheetDateVal < 60000) {
      try {
        var jsDate = new Date(Math.round((sheetDateVal - 25569) * 86400 * 1000));
        var dVNNum = Utilities.formatDate(jsDate, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");
        if (dVNNum === todayVN) return true;
      } catch (e) {}
    }

    // 3. Phân tách ngày theo linh hoạt các định dạng chuỗi
    var p = parseDatePartsGS(sheetDateVal);
    if (p && p.d === todayD && p.m === todayM && p.y === todayY) {
      return true;
    }

    // 4. Tìm kiếm chuỗi con trực tiếp
    var str = sheetDateVal.toString().trim();
    if (str.indexOf(todayVN) !== -1 || str.indexOf(todayISO) !== -1 || str.indexOf(todayCompact) !== -1) {
      return true;
    }
  }

  // 5. Fallback đối chiếu với mã id_dat (Ví dụ: S8-20260907-001)
  if (idDat) {
    var idStr = idDat.toString().trim();
    if (idStr.indexOf(todayCompact) !== -1) {
      return true;
    }
  }

  return false;
}

/**
 * Tự động ánh xạ chỉ số các cột của Sheet DATBAN (đảm bảo không bị lệch cột khi n8n ghi thêm/đổi cột)
 */
function mapDatBanColumns(headerRow) {
  var map = {
    id_dat: 0,
    ngay_dat: 1,
    gio_dat: 2,
    ten_khach: 3,
    sdt: 4,
    so_khach: 5,
    ban_xep: 6,
    yeu_cau_ban: 7,
    dat_mon_truoc: 8,
    dat_coc: 9,
    tien_coc: 10,
    trang_thai: 11,
    nguoi_nhap: 12,
    thoi_gian_nhap: 13,
    ghi_chu: 14
  };
  if (!headerRow || !headerRow.length) return map;
  for (var i = 0; i < headerRow.length; i++) {
    var h = (headerRow[i] || "").toString().trim().toLowerCase().replace(/[\s_\-]/g, "");
    if (h === "iddat" || h === "madon" || h === "id" || h === "ma") map.id_dat = i;
    else if (h === "ngaydat" || h === "ngay" || h === "date") map.ngay_dat = i;
    else if (h === "giodat" || h === "gio" || h === "time") map.gio_dat = i;
    else if (h === "tenkhach" || h === "khachhang" || h === "ten") map.ten_khach = i;
    else if (h === "sdt" || h === "sodienthoai" || h === "phone") map.sdt = i;
    else if (h === "sokhach" || h === "soluongkhach" || h === "pax") map.so_khach = i;
    else if (h === "banxep" || h === "danhsachban" || h === "ban" || h === "soban") map.ban_xep = i;
    else if (h === "yeucauban" || h === "yeucau") map.yeu_cau_ban = i;
    else if (h === "datmontruoc" || h === "montruoc") map.dat_mon_truoc = i;
    else if (h === "datcoc" || h === "tiencoc" || h === "sotiencoc") {
      if (h === "datcoc") map.dat_coc = i;
      else map.tien_coc = i;
    }
    else if (h === "trangthai" || h === "status") map.trang_thai = i;
    else if (h === "nguoinhap" || h === "nhanvien") map.nguoi_nhap = i;
    else if (h === "thoigiannhap" || h === "timestamp") map.thoi_gian_nhap = i;
    else if (h === "ghichu" || h === "note") map.ghi_chu = i;
  }
  return map;
}

/**
 * Hiển thị ngày dạng dd/MM/yyyy
 */
function formatDateCellDisplay(val) {
  if (!val) return "";
  var p = parseDatePartsGS(val);
  if (!p) return val.toString();
  return ("0" + p.d).slice(-2) + "/" + ("0" + p.m).slice(-2) + "/" + p.y;
}

/**
 * Định dạng ngày Việt Nam dd/MM/yyyy từ chuỗi YYYY-MM-DD
 */
function formatDateVN(dateStr) {
  if (!dateStr) return "";
  var str = dateStr.toString().trim();
  var parts = str.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return str;
}

/**
 * Chuẩn hóa giờ đặt sang dạng HH:mm độc lập hoàn toàn múi giờ
 * TUYỆT ĐỐI KHÔNG dùng Utilities.formatDate trên Date gốc (1899) để tránh lệch giờ do múi giờ lịch sử LMT (+07:06:40)
 */
function formatTimeCellGS(val, displayVal) {
  // 1. Ưu tiên đọc chuỗi hiển thị trực tiếp từ ô Google Sheet nếu có
  if (displayVal !== undefined && displayVal !== null) {
    var dStr = displayVal.toString().trim();
    if (dStr) {
      // Dạng 19:00 hoặc 7:00 PM hoặc 10:06:40 AM
      var match12 = dStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
      if (match12) {
        var hh = parseInt(match12[1], 10);
        var mm = match12[2];
        var isPM = /PM/i.test(match12[3] || "");
        var isAM = /AM/i.test(match12[3] || "");
        if (isPM && hh < 12) hh += 12;
        if (isAM && hh === 12) hh = 0;
        return ("0" + hh).slice(-2) + ":" + mm;
      }
      // Dạng 19h hoặc 19h30
      var matchH = dStr.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
      if (matchH) {
        var hH = parseInt(matchH[1], 10);
        var mH = matchH[2] ? parseInt(matchH[2], 10) : 0;
        return ("0" + hH).slice(-2) + ":" + ("0" + mH).slice(-2);
      }
    }
  }

  if (val === undefined || val === null || val === "") return "";

  // 2. Nếu là đối tượng Date trong Google Sheet: Lấy getHours() & getMinutes() trực tiếp
  if (Object.prototype.toString.call(val) === '[object Date]') {
    var h = val.getHours();
    var m = val.getMinutes();
    return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
  }

  // 3. Nếu là chuỗi ký tự
  var s = val.toString().trim();
  var matchStr = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (matchStr) {
    var h2 = parseInt(matchStr[1], 10);
    var m2 = matchStr[2];
    var isPM2 = /PM/i.test(matchStr[3] || "");
    var isAM2 = /AM/i.test(matchStr[3] || "");
    if (isPM2 && h2 < 12) h2 += 12;
    if (isAM2 && h2 === 12) h2 = 0;
    return ("0" + h2).slice(-2) + ":" + m2;
  }
  var matchH2 = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
  if (matchH2) {
    var hH2 = parseInt(matchH2[1], 10);
    var mH2 = matchH2[2] ? parseInt(matchH2[2], 10) : 0;
    return ("0" + hH2).slice(-2) + ":" + ("0" + mH2).slice(-2);
  }

  return s;
}

/**
 * Cập nhật cột H trong CONFIG_BAN thành BLOCK hoặc ACTIVE
 */
function updateConfigBanStatus(reqTablesClean, newStatus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("CONFIG_BAN");
  if (!configSheet) return;
  
  var data = configSheet.getDataRange().getValues();
  var statusRanges = [];
  for (var i = 1; i < data.length; i++) {
    var maBan = data[i][1]; // Cột B
    if (!maBan) continue;
    
    var cleanB = cleanTableCode(maBan.toString());
    if (reqTablesClean.indexOf(cleanB) !== -1) {
      statusRanges.push("H" + (i + 1));
    }
  }
  if (statusRanges.length > 0) {
    configSheet.getRangeList(statusRanges).setValue(newStatus); // Cột H
  }
}

/**
 * Lấy toàn bộ danh sách đơn đặt bàn từ sheet DATBAN
 */
function getAllBookingsList(ss, filterDate) {
  var sheet = getSheetByNameRobust(ss, "DATBAN");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();
  var bookings = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dispRow = (displayData && displayData[i]) ? displayData[i] : [];
    if (!row[0] && !row[1] && !row[3]) continue;

    if (filterDate && filterDate !== "ALL") {
      if (!areDatesMatchingGS(row[1], filterDate)) continue;
    }

    var idDatStr = row[0] ? row[0].toString().trim() : ("N8N-R" + (i + 1));
    var rawBanStr = row[6] ? row[6].toString() : "";
    var formattedBanStr = formatBanListString(rawBanStr);
    var bansArray = formattedBanStr ? formattedBanStr.split(", ") : splitTableListGS(rawBanStr);

    // Chuẩn hóa giờ đặt độc lập múi giờ (tránh hoàn toàn lỗi 19:00 biến thành 10:06 AM)
    var gioDatStr = formatTimeCellGS(row[2], dispRow[2]);

    bookings.push({
      id_dat: idDatStr,
      ngay_dat: formatDateCellDisplay(row[1]),
      gio_dat: gioDatStr,
      ten_khach: row[3] ? row[3].toString() : "",
      sdt: row[4] ? row[4].toString() : "",
      so_khach: Number(row[5]) || 0,
      danh_sach_ban: bansArray,
      danh_sach_ban_raw: rawBanStr,
      yeu_cau_ban: row[7] ? row[7].toString() : "",
      dat_mon_truoc: row[8] ? row[8].toString() : "Không",
      dat_coc: row[9] ? row[9].toString() : "",
      tien_coc: Number(row[10]) || 0,
      trang_thai: row[11] ? row[11].toString() : "ĐÃ ĐẶT",
      nguoi_nhap: row[12] ? row[12].toString() : "",
      thoi_gian_nhap: row[13] ? (dispRow[13] || (row[13] instanceof Date ? Utilities.formatDate(row[13], "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss") : row[13].toString())) : "",
      ghi_chu: row[14] ? row[14].toString() : "",
      is_lock: (row[11] === "NO-SHOW" || row[3] === "KHÓA BÀN")
    });
  }
  return bookings;
}

/**
 * Xử lý chẩn đoán n8n
 */
function handleDiagnoseN8n(ss, e) {
  var sheet = ss.getSheetByName("DATBAN");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error", message: "Không tìm thấy sheet DATBAN"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  var data = sheet.getDataRange().getValues();
  var filterDate = e && e.parameter ? e.parameter.date : null;
  var recentRows = [];
  var start = Math.max(1, data.length - 20);

  for (var r = start; r < data.length; r++) {
    var row = data[r];
    recentRows.push({
      row_index: r + 1,
      id_dat: row[0] ? row[0].toString() : "",
      raw_date: row[1] ? row[1].toString() : "",
      date_matched: filterDate ? areDatesMatchingGS(row[1], filterDate) : true,
      ten_khach: row[3] ? row[3].toString() : "",
      raw_tables: row[6] ? row[6].toString() : "",
      parsed_tables: splitTableListGS(row[6] ? row[6].toString() : ""),
      raw_status: row[11] ? row[11].toString() : "",
      nguoi_nhap: row[12] ? row[12].toString() : "",
      ghi_chu: row[14] ? row[14].toString() : ""
    });
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    total_rows: data.length,
    recent_rows: recentRows
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 4. CÁC HÀM XỬ LÝ ĐẶT MÓN (TAB DATMON & MENU_MON / CONFIG_MON)
// ĐỒNG BỘ CHUẨN:
// TAB DATMON: Mỗi món ăn là 1 dòng riêng biệt:
// [id_dat, chi_nhanh, ten_mon, so_luong, ghi_chu, ngay_dat, gio_dat, danh_sach_ban, so_khach, ten_khach, ten_ban, don_gia, thanh_tien, id_mon, trang_thai_mon]
//
// TAB MENU_MON (8 cột chuẩn):
// [ma_mon, ten_mon, nhom_mon, loai_menu, don_vi_tinh, don_gia, mo_ta_chi_tiet, trang_thai_mon]
// ============================================================================

/**
 * Bản đồ nhận diện cột chuẩn xác và linh hoạt cho Sheet DATMON (15 cột chuẩn)
 */
function mapDatMonColumns(headers) {
  var map = {
    id_dat: 0,
    chi_nhanh: 1,
    ten_mon: 2,
    so_luong: 3,
    ghi_chu: 4,
    ngay_dat: 5,
    gio_dat: 6,
    danh_sach_ban: 7,
    so_khach: 8,
    ten_khach: 9,
    ten_ban: 10,
    don_gia: 11,
    thanh_tien: 12,
    id_mon: 13,
    trang_thai_mon: 14
  };

  if (!headers || headers.length === 0) return map;

  for (var i = 0; i < headers.length; i++) {
    var raw = (headers[i] || "").toString().trim().toLowerCase();
    var h = raw.replace(/[\r\n\s_\-]/g, "");

    if (h === "iddat" || h === "madat" || h === "madatban") map.id_dat = i;
    else if (h === "chinhanh") map.chi_nhanh = i;
    else if (h === "tenmon" || h === "monan") map.ten_mon = i;
    else if (h === "soluong" || h === "sl") map.so_luong = i;
    else if (h === "ghichu") map.ghi_chu = i;
    else if (h === "ngaydat") map.ngay_dat = i;
    else if (h === "giodat" || h === "gio") map.gio_dat = i;
    else if (h === "danhsachban" || h === "dsban" || h === "banxep") map.danh_sach_ban = i;
    else if (h === "sokhach") map.so_khach = i;
    else if (h === "tenkhach" || h === "khachhang") map.ten_khach = i;
    else if (h === "tenban" || h === "ban") map.ten_ban = i;
    else if (h === "dongia" || h === "gia") map.don_gia = i;
    else if (h === "thanhtien" || h === "tongtien") map.thanh_tien = i;
    else if (h === "idmon" || h === "mamon") map.id_mon = i;
    else if (h === "trangthaimon" || h === "trangthai") map.trang_thai_mon = i;
  }
  return map;
}

/**
 * Lấy hoặc khởi tạo Sheet DATMON đầy đủ 15 cột chuẩn
 */
function getOrCreateDatMonSheet(ss) {
  var sheet = getSheetByNameRobust(ss, "DATMON");
  var standardHeaders = [
    "id_dat", "chi_nhanh", "ten_mon", "so_luong", "ghi_chu",
    "ngay_dat", "gio_dat", "danh_sach_ban", "so_khach", "ten_khach",
    "ten_ban", "don_gia", "thanh_tien", "id_mon", "trang_thai_mon"
  ];
  if (!sheet) {
    sheet = ss.insertSheet("DATMON");
    sheet.appendRow(standardHeaders);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(standardHeaders);
  }
  return sheet;
}

/**
 * Tìm hàng trống đầu tiên trong DATMON (bắt đầu từ hàng 2 trở đi)
 * Dựa trên cột kiểm tra (mặc định cột 1: id_dat)
 */
function findFirstEmptyRowInSheet(sheet, checkCol) {
  var col = checkCol || 1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 2;

  var values = sheet.getRange(1, col, lastRow, 1).getValues();
  for (var r = 1; r < values.length; r++) { // r=1 tương ứng dòng 2
    var val = values[r][0];
    if (val === null || val === undefined || val.toString().trim() === "") {
      return r + 1; // 1-indexed row number
    }
  }
  return lastRow + 1;
}

/**
 * Tự động dồn các dòng dữ liệu trong DATMON lên sát dòng tiêu đề (từ dòng 2 trở đi)
 * Khắc phục triệt để tình trạng appendRow của Apps Script bị ghi xuống dòng 1001
 * do các hàng trống mặc định có sẵn của Google Sheet, giúp người dùng mở tab DATMON thấy ngay dữ liệu từ dòng 2
 */
function compactDatMonSheet(sheet) {
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var maxCols = Math.max(sheet.getLastColumn(), 15);

  var data = sheet.getRange(1, 1, lastRow, maxCols).getValues();
  var colMap = mapDatMonColumns(data[0]);

  var validRows = [];
  var hasEmptyBeforeData = false;
  var foundFirstEmpty = false;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var idCell = row[colMap.id_dat] ? row[colMap.id_dat].toString().trim() : "";
    var monCell = row[colMap.ten_mon] ? row[colMap.ten_mon].toString().trim() : "";

    if (idCell || monCell) {
      if (foundFirstEmpty) {
        hasEmptyBeforeData = true;
      }
      validRows.push(row);
    } else {
      foundFirstEmpty = true;
    }
  }

  // Nếu có khoảng trống giữa tiêu đề và dữ liệu (ví dụ data nằm ở dòng 1001 trở đi)
  if (hasEmptyBeforeData && validRows.length > 0) {
    sheet.getRange(2, 1, lastRow - 1, maxCols).clearContent();
    sheet.getRange(2, 1, validRows.length, maxCols).setValues(validRows);
  }
}

/**
 * Lấy danh sách món ăn đã đặt của 1 bàn từ sheet DATMON
 */
function getActiveMenusForBooking(ss, idDat) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var colMap = mapDatMonColumns(headers);

  var menus = [];
  var cleanIdDat = (idDat || "").toString().trim().toUpperCase();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dispRow = displayData[i] || [];
    var rowIdDat = row[colMap.id_dat] ? row[colMap.id_dat].toString().trim().toUpperCase() : "";
    var trangThaiMon = row[colMap.trang_thai_mon] ? row[colMap.trang_thai_mon].toString().trim().toUpperCase() : "ACTIVE";
    
    if (rowIdDat === cleanIdDat && trangThaiMon !== "ĐÃ XÓA") {
      var donGia = row[colMap.don_gia] ? (Number(row[colMap.don_gia].toString().replace(/[^\d]/g, "")) || 0) : 0;
      var soLuong = row[colMap.so_luong] ? (Number(row[colMap.so_luong]) || 1) : 1;
      var thanhTien = row[colMap.thanh_tien] ? (Number(row[colMap.thanh_tien].toString().replace(/[^\d]/g, "")) || (donGia * soLuong)) : (donGia * soLuong);

      menus.push({
        id_dat: rowIdDat,
        chi_nhanh: row[colMap.chi_nhanh] ? row[colMap.chi_nhanh].toString() : "",
        ten_mon: row[colMap.ten_mon] ? row[colMap.ten_mon].toString() : "",
        so_luong: soLuong,
        don_gia: donGia,
        thanh_tien: thanhTien,
        ghi_chu: row[colMap.ghi_chu] ? row[colMap.ghi_chu].toString() : "",
        ngay_dat: formatDateCellDisplay(row[colMap.ngay_dat]),
        gio_dat: formatTimeCellGS(row[colMap.gio_dat], dispRow[colMap.gio_dat]),
        danh_sach_ban: row[colMap.danh_sach_ban] ? row[colMap.danh_sach_ban].toString() : "",
        so_khach: row[colMap.so_khach] ? (Number(row[colMap.so_khach]) || 0) : 0,
        ten_khach: row[colMap.ten_khach] ? row[colMap.ten_khach].toString() : "",
        ten_ban: row[colMap.ten_ban] ? row[colMap.ten_ban].toString() : "",
        id_mon: row[colMap.id_mon] ? row[colMap.id_mon].toString() : (cleanIdDat + "-M" + ("0" + i).slice(-2)),
        trang_thai_mon: "ACTIVE"
      });
    }
  }
  return menus;
}

/**
 * Lấy toàn bộ món ăn trong tab DATMON để xem và kiểm tra
 */
function getAllActiveMenusFromDatMon(ss, options) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return [];
  // Tự động dồn các dòng trống nếu dữ liệu bị trôi xuống xa (dòng 1001)
  compactDatMonSheet(sheet);

  var data = sheet.getDataRange().getValues();
  var displayData = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var colMap = mapDatMonColumns(headers);
  var list = [];
  options = options || {};
  var filterDate = (options.date || "ALL").toString().trim();
  var filterIds = {};
  var rawIds = Array.isArray(options.idDats)
    ? options.idDats
    : (options.idDats || "").toString().split(/[,;\n]+/);
  for (var f = 0; f < rawIds.length; f++) {
    var filterId = (rawIds[f] || "").toString().trim().toUpperCase();
    if (filterId) filterIds[filterId] = true;
  }
  var hasIdFilter = Object.keys(filterIds).length > 0;
  var filterDateParts = filterDate !== "ALL" ? parseDatePartsGS(filterDate) : null;
  var filterDateCompact = filterDateParts
    ? filterDateParts.y + ("0" + filterDateParts.m).slice(-2) + ("0" + filterDateParts.d).slice(-2)
    : "";

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dispRow = displayData[i] || [];
    var rowIdDat = row[colMap.id_dat] ? row[colMap.id_dat].toString().trim() : "";
    var trangThai = row[colMap.trang_thai_mon] ? row[colMap.trang_thai_mon].toString().trim().toUpperCase() : "ACTIVE";
    var matchesId = !hasIdFilter || Boolean(filterIds[rowIdDat.toUpperCase()]);
    var matchesDate = filterDate === "ALL" || areDatesMatchingGS(row[colMap.ngay_dat], filterDate);
    if (!matchesDate && filterDateCompact && rowIdDat.indexOf(filterDateCompact) !== -1) matchesDate = true;

    if (rowIdDat && trangThai !== "ĐÃ XÓA" && matchesId && matchesDate) {
      var donGia = row[colMap.don_gia] ? (Number(row[colMap.don_gia].toString().replace(/[^\d]/g, "")) || 0) : 0;
      var soLuong = row[colMap.so_luong] ? (Number(row[colMap.so_luong]) || 1) : 1;
      var thanhTien = row[colMap.thanh_tien] ? (Number(row[colMap.thanh_tien].toString().replace(/[^\d]/g, "")) || (donGia * soLuong)) : (donGia * soLuong);

      var banStr = row[colMap.danh_sach_ban] ? row[colMap.danh_sach_ban].toString() : "";
      var formattedBan = formatBanListString(banStr) || banStr;

      var tenBanStr = row[colMap.ten_ban] ? row[colMap.ten_ban].toString() : "";
      var formattedTenBan = formatBanListString(tenBanStr) || tenBanStr;

      list.push({
        id_dat: rowIdDat,
        chi_nhanh: row[colMap.chi_nhanh] ? row[colMap.chi_nhanh].toString() : "",
        ten_mon: row[colMap.ten_mon] ? row[colMap.ten_mon].toString() : "",
        so_luong: soLuong,
        don_gia: donGia,
        thanh_tien: thanhTien,
        ghi_chu: row[colMap.ghi_chu] ? row[colMap.ghi_chu].toString() : "",
        ngay_dat: formatDateCellDisplay(row[colMap.ngay_dat]),
        gio_dat: formatTimeCellGS(row[colMap.gio_dat], dispRow[colMap.gio_dat]),
        danh_sach_ban: formattedBan,
        so_khach: row[colMap.so_khach] ? (Number(row[colMap.so_khach]) || 0) : 0,
        ten_khach: row[colMap.ten_khach] ? row[colMap.ten_khach].toString() : "",
        ten_ban: formattedTenBan,
        id_mon: row[colMap.id_mon] ? row[colMap.id_mon].toString() : ("M-" + i),
        trang_thai_mon: "ACTIVE"
      });
    }
  }
  return list;
}

/**
 * Đọc danh mục thực đơn tổng thể từ Sheet MENU_MON
 * Đồng bộ chính xác 8 cột:
 * A: ma_mon, B: ten_mon, C: nhom_mon, D: loai_menu, E: don_vi_tinh, F: don_gia, G: mo_ta_chi_tiet, H: trang_thai_mon
 */
function getMasterMenusFromSheet(ss) {
  var sheet = getSheetByNameRobust(ss, "MENU_MON");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return (h || "").toString().trim().toLowerCase(); });
  
  var idxMa = -1, idxTen = -1, idxNhom = -1, idxLoai = -1, idxDvt = -1, idxGia = -1, idxMoTa = -1, idxTrangThai = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (h.indexOf("ma_mon") !== -1 || h.indexOf("mã món") !== -1 || h === "id_mon") idxMa = c;
    else if (h.indexOf("ten_mon") !== -1 || h.indexOf("tên món") !== -1 || h === "món ăn") idxTen = c;
    else if (h.indexOf("nhom") !== -1 || h.indexOf("nhóm") !== -1 || h.indexOf("danh_muc") !== -1) idxNhom = c;
    else if (h.indexOf("loai") !== -1 || h.indexOf("loại") !== -1) idxLoai = c;
    else if (h.indexOf("don_vi") !== -1 || h.indexOf("đơn vị") !== -1 || h === "dvt") idxDvt = c;
    else if (h.indexOf("don_gia") !== -1 || h.indexOf("đơn giá") !== -1 || h.indexOf("gia") !== -1 || h.indexOf("giá") !== -1) idxGia = c;
    else if (h.indexOf("mo_ta") !== -1 || h.indexOf("mô tả") !== -1 || h.indexOf("chi_tiet") !== -1) idxMoTa = c;
    else if (h.indexOf("trang_thai") !== -1 || h.indexOf("trạng thái") !== -1) idxTrangThai = c;
  }

  if (idxMa === -1) idxMa = 0;
  if (idxTen === -1) idxTen = 1;
  if (idxNhom === -1) idxNhom = 2;
  if (idxLoai === -1) idxLoai = 3;
  if (idxDvt === -1) idxDvt = 4;
  if (idxGia === -1) idxGia = 5;
  if (idxMoTa === -1) idxMoTa = 6;
  if (idxTrangThai === -1) idxTrangThai = 7;

  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var tenMon = row[idxTen] ? row[idxTen].toString().trim() : "";
    if (tenMon) {
      var rawGia = row[idxGia];
      var donGia = 0;
      if (typeof rawGia === "number") {
        donGia = rawGia;
      } else if (rawGia) {
        donGia = Number(rawGia.toString().replace(/[^\d]/g, "")) || 0;
      }

      var rawStatus = (row[idxTrangThai] || "").toString().trim().toUpperCase();
      var isInactive = (rawStatus === "INACTIVATE" || rawStatus === "INACTIVE" || rawStatus === "NGƯNG" || rawStatus === "HẾT" || rawStatus === "TẠM HẾT" || rawStatus === "BLOCK");
      var maMon = row[idxMa] ? row[idxMa].toString().trim() : ("MON-" + i);

      items.push({
        id_mon_master: maMon,
        ma_mon: maMon,
        ten_mon: tenMon,
        nhom_mon: row[idxNhom] ? row[idxNhom].toString().trim() : "Món chính",
        danh_muc: row[idxNhom] ? row[idxNhom].toString().trim() : "Món chính",
        loai_menu: row[idxLoai] ? row[idxLoai].toString().trim() : "Thường",
        don_vi_tinh: row[idxDvt] ? row[idxDvt].toString().trim() : "Phần",
        don_gia: donGia,
        mo_ta_chi_tiet: row[idxMoTa] ? row[idxMoTa].toString().trim() : "",
        trang_thai: isInactive ? "INACTIVATE" : "ACTIVE"
      });
    }
  }
  return items;
}

/**
 * Cập nhật danh sách bàn trong tab DATMON khi đổi bàn hoặc ghép bàn
 */
function updateDatMonTableList(ss, idDat, newBanStr) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;
  var headers = data[0];
  var colMap = mapDatMonColumns(headers);

  var formattedBanStr = formatBanListString(newBanStr) || (newBanStr ? newBanStr.toString().trim() : "");
  var firstBan = "";
  if (formattedBanStr) {
    var bParts = formattedBanStr.split(/[,;\s]+/);
    firstBan = bParts[0] || formattedBanStr;
  }

  var tableListRanges = [];
  var tableNameRanges = [];
  var targetId = (idDat || "").toString().trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    var rId = data[i][colMap.id_dat] ? data[i][colMap.id_dat].toString().trim().toLowerCase() : "";
    if (rId && targetId && rId === targetId) {
      if (colMap.danh_sach_ban >= 0) {
        tableListRanges.push(sheet.getRange(i + 1, colMap.danh_sach_ban + 1).getA1Notation());
      }
      if (colMap.ten_ban >= 0 && firstBan) {
        tableNameRanges.push(sheet.getRange(i + 1, colMap.ten_ban + 1).getA1Notation());
      }
    }
  }
  if (tableListRanges.length > 0) sheet.getRangeList(tableListRanges).setValue(formattedBanStr);
  if (tableNameRanges.length > 0) sheet.getRangeList(tableNameRanges).setValue(firstBan);
}

/**
 * Thêm món ăn vào DATMON:
 * YÊU CẦU: MỖI MÓN LÀ 1 DÒNG DUY NHẤT
 * TỰ ĐỘNG LƯU VÀ ĐIỀN TOÀN BỘ 15 CỘT:
 * id_dat, chi_nhanh, ten_mon, so_luong, ghi_chu, ngay_dat, gio_dat, danh_sach_ban, so_khach, ten_khach, ten_ban, don_gia, thanh_tien, id_mon, trang_thai_mon
 */
function handleAddMenuGS(ss, data) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return { status: "error", message: "Không thể mở sheet DATMON" };
  
  // Dồn gọn dữ liệu nếu có các dòng trống nằm xen kẽ hoặc bị nhảy xuống dòng 1001
  compactDatMonSheet(sheet);

  var idDat = (data.id_dat || "").toString().trim();
  if (!idDat) return { status: "error", message: "Thiếu mã đặt bàn (id_dat)" };

  var items = data.items || [];
  if (items.length === 0) return { status: "error", message: "Không có món ăn cần thêm" };

  var rawData = sheet.getDataRange().getValues();
  var headers = rawData.length > 0 ? rawData[0] : [];
  var colMap = mapDatMonColumns(headers);

  // Đếm số món hiện có của đơn này để đặt id_mon liên tục (M01, M02...)
  var count = 0;
  for (var i = 1; i < rawData.length; i++) {
    var rId = rawData[i][colMap.id_dat] ? rawData[i][colMap.id_dat].toString().trim() : "";
    if (rId === idDat) count++;
  }

  // Tra cứu thông tin từ DATBAN để điền đồng bộ nếu chưa có
  var sheetDatBan = getSheetByNameRobust(ss, "DATBAN");
  var bRow = null;
  var bDisplayRow = null;
  if (sheetDatBan) {
    var dbRows = sheetDatBan.getDataRange().getValues();
    var dbDisplayRows = sheetDatBan.getDataRange().getDisplayValues();
    for (var j = 1; j < dbRows.length; j++) {
      if (dbRows[j][0] && dbRows[j][0].toString().trim() === idDat) {
        bRow = dbRows[j];
        bDisplayRow = dbDisplayRows[j];
        // Đánh dấu đặt món trước = "Có" (Cột 9 / Cột I của DATBAN)
        sheetDatBan.getRange(j + 1, 9).setValue("Có");
        break;
      }
    }
  }

  var ngayDat = bRow ? formatDateCellDisplay(bRow[1]) : (data.ngay_dat ? formatDateVN(data.ngay_dat) : "");
  
  // Xử lý giờ đặt độc lập múi giờ (tránh lỗi 19:00 bị biến thành 10:06)
  var gioDat = "";
  if (data.gio_dat) {
    gioDat = formatTimeCellGS(data.gio_dat);
  } else if (bRow) {
    gioDat = formatTimeCellGS(bRow[2], bDisplayRow ? bDisplayRow[2] : "");
  }

  var tenKhach = (data.ten_khach || (bRow && bRow[3] ? bRow[3].toString() : "")).toString().trim();
  var soKhach = Number(data.so_khach) || (bRow ? Number(bRow[5]) || 0 : 0);

  // Chuẩn hóa định dạng bàn thành chuẩn "B05, B04" hoặc "B54, B59" (KHÔNG để dạng rút gọn 5, 4)
  var rawBan = (data.danh_sach_ban || (bRow && bRow[6] ? bRow[6].toString() : "")).toString().trim();
  var danhSachBan = formatBanListString(rawBan) || rawBan;

  var tenBan = (data.ten_ban ? formatBanListString(data.ten_ban) : "").toString().trim();
  if (!tenBan && danhSachBan) {
    var bParts = danhSachBan.split(/[,;\s]+/);
    tenBan = bParts[0] || danhSachBan;
  }
  var chiNhanh = (data.chi_nhanh || "S8 Tân Phú").toString().trim();

  var totalNewAmount = 0;
  var addedItems = [];

  // Tìm index lớn nhất để tạo mảng row đủ chiều dài
  var maxColIdx = 15;
  for (var k in colMap) {
    if (colMap[k] >= maxColIdx) maxColIdx = colMap[k] + 1;
  }

  if (sheet.getMaxColumns() < maxColIdx) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), maxColIdx - sheet.getMaxColumns());
  }

  // Tìm dòng trống đầu tiên từ dòng 2 trở đi để ghi liên tục, không bị nhảy xuống dòng 1001
  var targetRow = findFirstEmptyRowInSheet(sheet, colMap.id_dat + 1);

  var newRows = [];

  // Tạo toàn bộ dữ liệu trong bộ nhớ rồi ghi một lần để giảm số lượt gọi Google Sheets.
  items.forEach(function(item) {
    count++;
    var idMon = idDat + "-M" + ("0" + count).slice(-2);
    var donGia = Number(item.don_gia) || 0;
    var soLuong = Number(item.so_luong) || 1;
    var thanhTien = donGia * soLuong;
    totalNewAmount += thanhTien;

    var rowArray = new Array(maxColIdx);
    for (var c = 0; c < maxColIdx; c++) rowArray[c] = "";

    rowArray[colMap.id_dat] = idDat;
    rowArray[colMap.chi_nhanh] = chiNhanh;
    rowArray[colMap.ten_mon] = item.ten_mon || "";
    rowArray[colMap.so_luong] = soLuong;
    rowArray[colMap.ghi_chu] = item.ghi_chu || "";
    rowArray[colMap.ngay_dat] = ngayDat;
    rowArray[colMap.gio_dat] = gioDat;
    rowArray[colMap.danh_sach_ban] = danhSachBan;
    rowArray[colMap.so_khach] = soKhach;
    rowArray[colMap.ten_khach] = tenKhach;
    rowArray[colMap.ten_ban] = tenBan;
    rowArray[colMap.don_gia] = donGia;
    rowArray[colMap.thanh_tien] = thanhTien;
    rowArray[colMap.id_mon] = idMon;
    rowArray[colMap.trang_thai_mon] = "ACTIVE";

    newRows.push(rowArray);

    addedItems.push({
      id_mon: idMon,
      id_dat: idDat,
      chi_nhanh: chiNhanh,
      ten_mon: item.ten_mon,
      so_luong: soLuong,
      ghi_chu: item.ghi_chu || "",
      ngay_dat: ngayDat,
      gio_dat: gioDat,
      danh_sach_ban: danhSachBan,
      so_khach: soKhach,
      ten_khach: tenKhach,
      ten_ban: tenBan,
      don_gia: donGia,
      thanh_tien: thanhTien,
      trang_thai_mon: "ACTIVE"
    });
  });

  var requiredLastRow = targetRow + newRows.length - 1;
  if (requiredLastRow > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
  }
  sheet.getRange(targetRow, 1, newRows.length, maxColIdx).setValues(newRows);

  return {
    status: "success",
    message: "Đã thêm " + items.length + " món vào đơn " + idDat + " trên tab DATMON",
    count: items.length,
    total_amount: totalNewAmount,
    items: addedItems
  };
}

function handleUpdateMenuGS(ss, data) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return { status: "error", message: "Không tìm thấy sheet DATMON" };
  var idMon = (data.id_mon || "").toString().trim();
  if (!idMon) return { status: "error", message: "Thiếu mã món id_mon" };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { status: "not_found", message: "Sheet DATMON trống" };
  var headers = rows[0];
  var colMap = mapDatMonColumns(headers);

  for (var i = 1; i < rows.length; i++) {
    var rIdMon = rows[i][colMap.id_mon] ? rows[i][colMap.id_mon].toString().trim() : "";
    if (rIdMon === idMon) {
      var currentGia = rows[i][colMap.don_gia] ? (Number(rows[i][colMap.don_gia].toString().replace(/[^\d]/g, "")) || 0) : 0;
      var newQty = data.so_luong !== undefined ? (Number(data.so_luong) || 1) : (Number(rows[i][colMap.so_luong]) || 1);

      if (data.so_luong !== undefined && colMap.so_luong >= 0) sheet.getRange(i + 1, colMap.so_luong + 1).setValue(newQty);
      if (data.ten_mon !== undefined && colMap.ten_mon >= 0) sheet.getRange(i + 1, colMap.ten_mon + 1).setValue(data.ten_mon);
      if (data.ghi_chu !== undefined && colMap.ghi_chu >= 0) sheet.getRange(i + 1, colMap.ghi_chu + 1).setValue(data.ghi_chu);
      if (colMap.thanh_tien >= 0) sheet.getRange(i + 1, colMap.thanh_tien + 1).setValue(currentGia * newQty);

      return { status: "success", message: "Đã cập nhật món " + idMon };
    }
  }
  return { status: "not_found", message: "Không tìm thấy mã món " + idMon };
}

function handleDeleteMenuGS(ss, data) {
  var sheet = getOrCreateDatMonSheet(ss);
  if (!sheet) return { status: "error", message: "Không tìm thấy sheet DATMON" };
  var idMon = (data.id_mon || "").toString().trim();
  if (!idMon) return { status: "error", message: "Thiếu mã món id_mon" };

  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { status: "not_found", message: "Sheet DATMON trống" };
  var headers = rows[0];
  var colMap = mapDatMonColumns(headers);
  var ttColIdx = colMap.trang_thai_mon >= 0 ? colMap.trang_thai_mon + 1 : 15;

  for (var i = 1; i < rows.length; i++) {
    var rIdMon = rows[i][colMap.id_mon] ? rows[i][colMap.id_mon].toString().trim() : "";
    if (rIdMon === idMon) {
      sheet.getRange(i + 1, ttColIdx).setValue("ĐÃ XÓA");
      return { status: "success", message: "Đã xóa món " + idMon };
    }
  }
  return { status: "not_found", message: "Không tìm thấy mã món " + idMon };
}

// ============================================================================
// 5. TỰ ĐỘNG TẠO VÀ ĐỒNG BỘ 2 TAB: VIEW_HOMNAY VÀ VIEW_BEP_HOMNAY
// ============================================================================

/**
 * Ghi trạng thái rỗng cho tab VIEW_HOMNAY khi chưa có bàn nào hôm nay mà KHÔNG phá vỡ tỉ lệ cột
 */
function writeEmptyViewHomNay(viewSheet, todayStr) {
  var headers = [
    "STT", "ID ĐẶT", "GIỜ ĐẶT", "BÀN XẾP", "TÊN KHÁCH", 
    "SỐ ĐIỆN THOẠI", "SỐ KHÁCH", "TRẠNG THÁI", "TIỀN CỌC", 
    "MÓN ĐÃ ĐẶT (TỪ DATMON)", "GHI CHÚ", "NGƯỜI NHẬP"
  ];
  var lastRow = viewSheet.getLastRow();
  if (lastRow > 1) {
    viewSheet.getRange(2, 1, lastRow - 1, viewSheet.getMaxColumns()).clearContent();
  }
  if (lastRow === 0) {
    viewSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    viewSheet.getRange(1, 1, 1, headers.length)
             .setBackground("#1e293b").setFontColor("#f8fafc").setFontWeight("bold").setHorizontalAlignment("center");
    viewSheet.setFrozenRows(1);
  }
  viewSheet.getRange(2, 1, 1, headers.length).setValues([[
    1, "-", "-", "-", "Hôm nay chưa có đơn đặt bàn nào (" + todayStr + ")", "-", "-", "-", "-", "-", "-", "-"
  ]]);
}

/**
 * Ghi trạng thái rỗng cho tab VIEW_BEP_HOMNAY khi chưa có món nào hôm nay mà KHÔNG phá vỡ tỉ lệ cột
 */
function writeEmptyViewBepHomNay(viewSheet, todayStr) {
  var headers = [
    "STT", "GIỜ LÊN MÓN", "BÀN", "TÊN MÓN ĂN", "SỐ LƯỢNG", 
    "GHI CHÚ ĐẦU BẾP", "TÊN KHÁCH", "SỐ KHÁCH", 
    "TRẠNG THÁI MÓN", "MÃ MÓN", "MÃ ĐƠN"
  ];
  var lastRow = viewSheet.getLastRow();
  if (lastRow > 1) {
    viewSheet.getRange(2, 1, lastRow - 1, viewSheet.getMaxColumns()).clearContent();
    viewSheet.getRange(2, 6, lastRow - 1, 1).setBackground(null).setFontColor(null).setFontWeight("normal");
  }
  if (lastRow === 0) {
    viewSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    viewSheet.getRange(1, 1, 1, headers.length)
             .setBackground("#065f46").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    viewSheet.setFrozenRows(1);
  }
  viewSheet.getRange(2, 1, 1, headers.length).setValues([[
    1, "-", "-", "Hôm nay chưa có món nào cần nấu (" + todayStr + ")", "-", "-", "-", "-", "-", "-", "-"
  ]]);
}

/**
 * Cập nhật tab VIEW_HOMNAY dành cho Chủ SMO và Quản lý
 * Kiểm tra ngày trong tab DATBAN có trùng với ngày hiện tại (múi giờ VN) hay không.
 * Nếu có thì tự điền đầy đủ thông tin vào tab VIEW_HOMNAY đúng định dạng và KHÔNG phá vỡ tỉ lệ cột.
 */
function updateViewHomNay(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var datbanSheet = getSheetByNameRobust(ss, "DATBAN");
  if (!datbanSheet) return { status: "error", message: "Không tìm thấy sheet DATBAN" };

  var viewSheet = ss.getSheetByName("VIEW_HOMNAY");
  if (!viewSheet) {
    viewSheet = ss.insertSheet("VIEW_HOMNAY");
  }

  var now = new Date();
  var todayStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");

  var rows = datbanSheet.getDataRange().getValues();
  var dispRows = datbanSheet.getDataRange().getDisplayValues();
  if (rows.length <= 1) {
    writeEmptyViewHomNay(viewSheet, todayStr);
    return { status: "empty", count: 0, date: todayStr };
  }

  var colMap = mapDatBanColumns(rows[0]);

  // Đọc danh sách món hôm nay từ DATMON để tóm tắt số món/tên món vào cột MÓN ĐÃ ĐẶT
  var datmonSheet = getSheetByNameRobust(ss, "DATMON");
  var orderMenuSummaryMap = {};
  if (datmonSheet && datmonSheet.getLastRow() > 1) {
    var dmData = datmonSheet.getDataRange().getValues();
    var dmColMap = mapDatMonColumns(dmData[0]);
    for (var m = 1; m < dmData.length; m++) {
      var idDatM = dmData[m][dmColMap.id_dat] ? dmData[m][dmColMap.id_dat].toString().trim() : "";
      var trangThaiMon = dmData[m][dmColMap.trang_thai_mon] ? dmData[m][dmColMap.trang_thai_mon].toString().trim().toUpperCase() : "ACTIVE";
      if (idDatM && trangThaiMon !== "ĐÃ XÓA") {
        var tenMon = dmData[m][dmColMap.ten_mon] || "";
        var sl = dmData[m][dmColMap.so_luong] || 1;
        var gc = dmData[m][dmColMap.ghi_chu] ? (" (" + dmData[m][dmColMap.ghi_chu] + ")") : "";
        var itemStr = tenMon + " x" + sl + gc;
        if (!orderMenuSummaryMap[idDatM]) orderMenuSummaryMap[idDatM] = [];
        orderMenuSummaryMap[idDatM].push(itemStr);
      }
    }
  }

  var todayBookings = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var dispR = dispRows[i] || [];
    var ngayDatRaw = r[colMap.ngay_dat];
    var idDat = r[colMap.id_dat] ? r[colMap.id_dat].toString().trim() : "";

    // KIỂM TRA NGÀY TRONG TAB DATBAN CÓ TRÙNG VỚI NGÀY HIỆN TẠI KHÔNG
    if (isDateMatchingTodayGS(ngayDatRaw, idDat)) {
      var gioDat = formatTimeCellGS(r[colMap.gio_dat], dispR[colMap.gio_dat]) || "18:00";
      var tenKhach = r[colMap.ten_khach] ? r[colMap.ten_khach].toString() : "Khách Lẻ";
      var rawSdt = dispR[colMap.sdt] || (r[colMap.sdt] ? r[colMap.sdt].toString() : "");
      var sdt = rawSdt ? rawSdt.toString().replace(/^'+/, '') : "";
      var soKhach = Number(r[colMap.so_khach]) || 0;
      var rawBan = r[colMap.ban_xep] ? r[colMap.ban_xep].toString() : "";
      var banXep = formatBanListString(rawBan) || rawBan;
      var trangThai = r[colMap.trang_thai] ? r[colMap.trang_thai].toString() : "ĐÃ ĐẶT";
      var tienCoc = r[colMap.tien_coc] || "";
      var ghiChu = r[colMap.ghi_chu] || "";
      var nguoiNhap = r[colMap.nguoi_nhap] || "";
      var monDat = (orderMenuSummaryMap[idDat] && orderMenuSummaryMap[idDat].length > 0)
        ? orderMenuSummaryMap[idDat].join("; ")
        : (r[colMap.dat_mon_truoc] || "Không");

      todayBookings.push({
        id_dat: idDat,
        gio_dat: gioDat,
        ban_xep: banXep,
        ten_khach: tenKhach,
        sdt: sdt,
        so_khach: soKhach,
        trang_thai: trangThai,
        tien_coc: tienCoc,
        mon_dat: monDat,
        ghi_chu: ghiChu,
        nguoi_nhap: nguoiNhap
      });
    }
  }

  // Sắp xếp theo giờ đặt tăng dần
  todayBookings.sort(function(a, b) {
    return (a.gio_dat || "").localeCompare(b.gio_dat || "");
  });

  var headers = [
    "STT", "ID ĐẶT", "GIỜ ĐẶT", "BÀN XẾP", "TÊN KHÁCH", 
    "SỐ ĐIỆN THOẠI", "SỐ KHÁCH", "TRẠNG THÁI", "TIỀN CỌC", 
    "MÓN ĐÃ ĐẶT (TỪ DATMON)", "GHI CHÚ", "NGƯỜI NHẬP"
  ];

  // Khởi tạo dòng tiêu đề nếu sheet mới tinh
  var lastRow = viewSheet.getLastRow();
  if (lastRow === 0) {
    viewSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    viewSheet.getRange(1, 1, 1, headers.length)
             .setBackground("#1e293b")
             .setFontColor("#f8fafc")
             .setFontWeight("bold")
             .setHorizontalAlignment("center");
    viewSheet.setFrozenRows(1);
  }

  // Xóa sạch nội dung cũ từ dòng 2 trở đi mà KHÔNG xóa độ rộng cột và định dạng sẵn có
  if (lastRow > 1) {
    viewSheet.getRange(2, 1, lastRow - 1, viewSheet.getMaxColumns()).clearContent();
  }

  var dataRows = [];
  if (todayBookings.length === 0) {
    dataRows.push([
      1, "-", "-", "-", "Hôm nay chưa có đơn đặt bàn nào (" + todayStr + ")", "-", "-", "-", "-", "-", "-", "-"
    ]);
  } else {
    for (var k = 0; k < todayBookings.length; k++) {
      var b = todayBookings[k];
      dataRows.push([
        k + 1,
        b.id_dat,
        b.gio_dat,
        b.ban_xep,
        b.ten_khach,
        b.sdt,
        b.so_khach,
        b.trang_thai,
        b.tien_coc,
        b.mon_dat,
        b.ghi_chu,
        b.nguoi_nhap
      ]);
    }
  }

  // Ghi dữ liệu vào sheet từ dòng 2
  viewSheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);

  // Định dạng viền nhẹ cho các dòng dữ liệu mà không ảnh hưởng tỉ lệ cột
  var allDataRange = viewSheet.getRange(1, 1, dataRows.length + 1, headers.length);
  allDataRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  return { status: "success", count: todayBookings.length, date: todayStr };
}

/**
 * Cập nhật tab VIEW_BEP_HOMNAY dành cho Đầu bếp và Bếp trưởng
 * Kiểm tra ngày trong tab DATMON có trùng với ngày hiện tại (múi giờ VN) hay không.
 * Tự động đối chiếu chéo với mã ID đặt bàn hôm nay từ DATBAN để không bao giờ sót món.
 * Bảo toàn 100% tỉ lệ độ rộng cột và căn chỉnh mà người dùng đã thiết lập trên Google Sheets.
 */
function updateViewBepHomNay(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var datmonSheet = getSheetByNameRobust(ss, "DATMON");
  if (!datmonSheet) return { status: "error", message: "Không tìm thấy sheet DATMON" };

  var viewSheet = ss.getSheetByName("VIEW_BEP_HOMNAY");
  if (!viewSheet) {
    viewSheet = ss.insertSheet("VIEW_BEP_HOMNAY");
  }

  var now = new Date();
  var todayStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy");

  var rows = datmonSheet.getDataRange().getValues();
  var dispRows = datmonSheet.getDataRange().getDisplayValues();
  if (rows.length <= 1) {
    writeEmptyViewBepHomNay(viewSheet, todayStr);
    return { status: "empty", count: 0, date: todayStr };
  }

  var colMap = mapDatMonColumns(rows[0]);

  // Lấy danh sách ID đặt bàn hôm nay từ DATBAN làm nguồn đối chiếu bổ sung (phòng khi DATMON thiếu cột ngày)
  var todayBookingIdSet = {};
  var datbanSheet = getSheetByNameRobust(ss, "DATBAN");
  if (datbanSheet && datbanSheet.getLastRow() > 1) {
    var dbData = datbanSheet.getDataRange().getValues();
    var dbColMap = mapDatBanColumns(dbData[0]);
    for (var b = 1; b < dbData.length; b++) {
      var rowB = dbData[b];
      var idDatB = rowB[dbColMap.id_dat] ? rowB[dbColMap.id_dat].toString().trim() : "";
      if (idDatB && isDateMatchingTodayGS(rowB[dbColMap.ngay_dat], idDatB)) {
        todayBookingIdSet[idDatB] = true;
      }
    }
  }

  var todayDishes = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var dispR = dispRows[i] || [];
    var idMon = r[colMap.id_mon] ? r[colMap.id_mon].toString().trim() : "";
    var idDat = r[colMap.id_dat] ? r[colMap.id_dat].toString().trim() : "";
    var trangThaiMon = r[colMap.trang_thai_mon] ? r[colMap.trang_thai_mon].toString().trim().toUpperCase() : "ACTIVE";
    if (trangThaiMon === "ĐÃ XÓA") continue;

    var ngayDatRaw = r[colMap.ngay_dat];
    var isToday = false;

    // KIỂM TRA NGÀY TRONG TAB DATMON CÓ TRÙNG VỚI NGÀY HIỆN TẠI KHÔNG
    if (isDateMatchingTodayGS(ngayDatRaw, idDat)) {
      isToday = true;
    } else if (idDat && todayBookingIdSet[idDat]) {
      // Đối chiếu chéo với đơn hôm nay từ DATBAN
      isToday = true;
    }

    if (isToday) {
      var rawBan = r[colMap.danh_sach_ban] || r[colMap.ten_ban] || "";
      var formattedBan = formatBanListString(rawBan) || rawBan;
      var gioDat = formatTimeCellGS(r[colMap.gio_dat], dispR[colMap.gio_dat]) || "18:00";

      todayDishes.push({
        gio_dat: gioDat,
        ban: formattedBan,
        ten_mon: r[colMap.ten_mon] ? r[colMap.ten_mon].toString() : "",
        so_luong: Number(r[colMap.so_luong]) || 1,
        ghi_chu_bep: r[colMap.ghi_chu] ? r[colMap.ghi_chu].toString() : "",
        ten_khach: r[colMap.ten_khach] ? r[colMap.ten_khach].toString() : "",
        so_khach: Number(r[colMap.so_khach]) || "",
        trang_thai_mon: trangThaiMon,
        id_mon: idMon,
        id_dat: idDat
      });
    }
  }

  // Sắp xếp món theo: Giờ ăn -> Bàn -> Tên món
  todayDishes.sort(function(a, b) {
    if (a.gio_dat !== b.gio_dat) return (a.gio_dat || "").localeCompare(b.gio_dat || "");
    if (a.ban !== b.ban) return (a.ban || "").localeCompare(b.ban || "");
    return (a.ten_mon || "").localeCompare(b.ten_mon || "");
  });

  var headers = [
    "STT", "GIỜ LÊN MÓN", "BÀN", "TÊN MÓN ĂN", "SỐ LƯỢNG", 
    "GHI CHÚ ĐẦU BẾP", "TÊN KHÁCH", "SỐ KHÁCH", 
    "TRẠNG THÁI MÓN", "MÃ MÓN", "MÃ ĐƠN"
  ];

  // Khởi tạo dòng tiêu đề nếu sheet mới tinh
  var lastRow = viewSheet.getLastRow();
  if (lastRow === 0) {
    viewSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    viewSheet.getRange(1, 1, 1, headers.length)
             .setBackground("#065f46")
             .setFontColor("#ffffff")
             .setFontWeight("bold")
             .setHorizontalAlignment("center");
    viewSheet.setFrozenRows(1);
  }

  // Xóa nội dung cũ từ dòng 2 trở đi mà KHÔNG xóa tỉ lệ độ rộng cột
  if (lastRow > 1) {
    viewSheet.getRange(2, 1, lastRow - 1, viewSheet.getMaxColumns()).clearContent();
    viewSheet.getRange(2, 6, lastRow - 1, 1).setBackground(null).setFontColor(null).setFontWeight("normal");
  }

  var dataRows = [];
  if (todayDishes.length === 0) {
    dataRows.push([
      1, "-", "-", "Hôm nay chưa có món nào cần nấu (" + todayStr + ")", "-", "-", "-", "-", "-", "-", "-"
    ]);
  } else {
    for (var k = 0; k < todayDishes.length; k++) {
      var d = todayDishes[k];
      dataRows.push([
        k + 1,
        d.gio_dat,
        d.ban,
        d.ten_mon,
        d.so_luong,
        d.ghi_chu_bep,
        d.ten_khach,
        d.so_khach,
        d.trang_thai_mon,
        d.id_mon,
        d.id_dat
      ]);
    }
  }

  // Ghi dữ liệu vào sheet
  viewSheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);

  // Viền bảng
  var allRange = viewSheet.getRange(1, 1, dataRows.length + 1, headers.length);
  allRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);

  // Tô màu cả cột ghi chú bằng một lần ghi thay vì gọi API cho từng ô.
  var noteBackgrounds = [];
  var noteFontColors = [];
  var noteFontWeights = [];
  for (var rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    var noteVal = dataRows[rowIdx][5];
    var hasNote = noteVal && noteVal.toString().trim() !== "" && noteVal.toString().trim() !== "-";
    noteBackgrounds.push([hasNote ? "#fef3c7" : null]);
    noteFontColors.push([hasNote ? "#b45309" : null]);
    noteFontWeights.push([hasNote ? "bold" : "normal"]);
  }
  viewSheet.getRange(2, 6, dataRows.length, 1)
           .setBackgrounds(noteBackgrounds)
           .setFontColors(noteFontColors)
           .setFontWeights(noteFontWeights);

  return { status: "success", count: todayDishes.length, date: todayStr };
}

/**
 * Cập nhật đồng thời cả 2 View hôm nay
 */
function updateAllViewsToday(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var resHomNay = updateViewHomNay(ss);
  var resBep = updateViewBepHomNay(ss);
  return {
    status: "success",
    view_homnay: resHomNay,
    view_bep_homnay: resBep
  };
}

/**
 * Tự động đồng bộ VIEW_HOMNAY và VIEW_BEP_HOMNAY an toàn (không gián đoạn luồng chính nếu có lỗi nhỏ)
 */
function syncAllViewsSafely(ss) {
  try {
    if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
    updateViewHomNay(ss);
    updateViewBepHomNay(ss);
  } catch (err) {
    Logger.log("syncAllViewsSafely error: " + err);
  }
}

/**
 * Tự động cập nhật khi có người chỉnh sửa trực tiếp trên Google Sheet
 */
function onEdit(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = e && e.range ? e.range.getSheet() : null;
    var sName = sheet ? sheet.getName().toUpperCase() : "";
    if (sName === "DATBAN" || sName === "DATMON" || sName === "CONFIG_BAN") {
      invalidateSodobaDynamicCache();
    }
    if (sName === "MENU_MON" || sName === "CONFIG_MON") {
      invalidateSodobaMasterMenuCache();
    }
    if (sName === "DATBAN" || sName === "DATMON") {
      syncAllViewsSafely(ss);
    }
  } catch (err) {
    Logger.log("onEdit error: " + err);
  }
}

/**
 * Tự động cập nhật khi có dòng mới chèn từ bên ngoài (như n8n workflow, Webhook, Form)
 */
function onChange(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    invalidateSodobaDynamicCache();
    invalidateSodobaMasterMenuCache();
    syncAllViewsSafely(ss);
  } catch (err) {
    Logger.log("onChange error: " + err);
  }
}
