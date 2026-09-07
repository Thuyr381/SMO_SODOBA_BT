// src/features/settings/SettingsView.tsx
import React, { useState } from 'react';
import { gasApi } from '../../services/gasApi';
import { Database, Link, CheckCircle2, RotateCcw, Play, FileSpreadsheet, ShieldCheck, HelpCircle, Activity, AlertTriangle, Copy, Code } from 'lucide-react';
import { TableStatusClass, BookingPayload, OrderMenuItem } from '../../types';

interface SettingsViewProps {
  onShowToast: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowToast, onRefreshAll }) => {
  const [gasUrl, setGasUrl] = useState(gasApi.getApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testLog, setTestLog] = useState<string>('');
  const [isDiagnosingN8n, setIsDiagnosingN8n] = useState(false);
  const [n8nDiagData, setN8nDiagData] = useState<any>(null);
  const [showGasScript, setShowGasScript] = useState(false);

  const handleSaveUrl = () => {
    gasApi.setApiUrl(gasUrl);
    onShowToast('Đã lưu cấu hình', 'URL Google Apps Script đã được cập nhật thành công', 'success');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestLog('Đang kiểm tra kết nối đến API Gateway và 2 tab DATBAN, DATMON...');
    try {
      const start = Date.now();
      const [statusMap, bookings, datMonItems] = await Promise.all([
        gasApi.getTableStatusMap(),
        gasApi.getAllBookings(),
        gasApi.getAllDatMonMenus(),
      ]);
      const elapsed = Date.now() - start;
      const countTables = Object.keys(statusMap).length;
      const countBookings = bookings.length;
      const countDatMon = datMonItems.length;

      setTestLog(
        `✅ KẾT NỐI THÀNH CÔNG (${elapsed}ms)!\n\n` +
        `📊 1. SƠ ĐỒ BÀN (CONFIG_BAN + DATBAN):\n` +
        `- Số bàn có trạng thái đặc biệt: ${countTables} bàn\n` +
        `- Chi tiết trạng thái: ${JSON.stringify(statusMap, null, 2)}\n\n` +
        `📋 2. DANH SÁCH ĐƠN (TAB DATBAN):\n` +
        `- Tổng số đơn tìm thấy: ${countBookings} đơn\n\n` +
        `🍲 3. DANH SÁCH MÓN ĐÃ ĐẶT (TAB DATMON):\n` +
        `- Tổng số món đang lưu trong DATMON: ${countDatMon} món\n` +
        (countDatMon === 0
          ? `-> Hiện tại table DATMON đang trống (0 món). Khi có khách đặt món, dữ liệu sẽ được ghi trực tiếp vào đây!`
          : `- Món đầu tiên: ${datMonItems[0].ten_mon} (SL: ${datMonItems[0].so_luong}) - Mã: ${datMonItems[0].id_mon}`)
      );
      onShowToast('Kết nối thành công', `Phản hồi: ${elapsed}ms | DATBAN: ${countBookings} đơn | DATMON: ${countDatMon} món`, 'success');
    } catch (err: any) {
      setTestLog(`❌ Lỗi kết nối: ${err?.message || 'Không thể gọi API'}\n\nHãy đảm bảo bạn đã triển khai Web App với quyền "Anyone" (Bất kỳ ai).`);
      onShowToast('Lỗi kết nối', 'Vui lòng kiểm tra lại URL Web App', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDiagnoseN8n = async () => {
    setIsDiagnosingN8n(true);
    try {
      const res = await gasApi.diagnoseN8nData();
      setN8nDiagData(res);
      if (res.status === 'success') {
        onShowToast('Chẩn đoán thành công', `Đã quét được ${res.total_rows || 0} dòng từ Google Sheet DATBAN`, 'success');
      } else {
        onShowToast('Lỗi chẩn đoán', res.message || 'Không thể đọc dữ liệu', 'error');
      }
    } catch (err: any) {
      onShowToast('Lỗi kết nối', err.message || 'Không thể gọi API', 'error');
    } finally {
      setIsDiagnosingN8n(false);
    }
  };

  const handleResetData = () => {
    gasApi.resetDemoData();
    onRefreshAll();
    onShowToast('Đã thiết lập lại', 'Dữ liệu demo SODOBA Tân Phú S8 đã được khôi phục về trạng thái chuẩn', 'info');
  };

  return (
    <div id="settings-view" className="w-full flex flex-col gap-5 max-w-4xl mx-auto">
      {/* GAS URL Config Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Link className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">KẾT NỐI GOOGLE APPS SCRIPT WEB APP</h3>
            <p className="text-xs text-slate-400">
              API Router Gateway kết nối trực tiếp với các Sheet: CONFIG_BAN, MENU_MON, DATBAN, DATMON
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            Google Apps Script Web App URL (POST / GET text/plain):
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="url"
              id="gas-url-input"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="btn-save-gas-url"
                onClick={handleSaveUrl}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
              >
                Lưu URL
              </button>
              <button
                type="button"
                id="btn-test-gas-connection"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Kiểm tra
              </button>
              <button
                type="button"
                id="btn-diagnose-n8n"
                onClick={handleDiagnoseN8n}
                disabled={isDiagnosingN8n}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 text-xs font-semibold disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Soi luồng n8n
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Mặc định ứng dụng chạy chế độ Offline Persistence & Local Engine siêu nhanh (&lt;50ms) mô phỏng chính xác cấu trúc dữ liệu Google Sheets.
          </p>
        </div>

        {/* Test Log Output */}
        {testLog && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto max-h-48">
              {testLog}
            </pre>
          </div>
        )}

        {/* n8n Diagnostic Output */}
        {n8nDiagData && (
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300">
                  KẾT QUẢ SOI LUỒNG N8N TRONG TAB DATBAN ({n8nDiagData.total_rows || 0} dòng)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setN8nDiagData(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Đóng
              </button>
            </div>

            {n8nDiagData.status !== 'success' ? (
              <div className="text-xs text-rose-400">
                {n8nDiagData.message || 'Lỗi không xác định khi đọc Google Apps Script'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] text-slate-300">
                  Cột header phát hiện: <span className="text-amber-400 font-mono">{(n8nDiagData.headers || []).join(' | ')}</span>
                </div>

                <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
                  {(n8nDiagData.recent_rows || []).map((row: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">
                          Dòng #{row.row_index}: {row.data?.['Tên khách'] || row.data?.['Khách hàng'] || row.data?.['ten_khach'] || 'Khách đặt'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status_class === 'booked' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          row.status_class === 'confirmed' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          row.status_class === 'arrived' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          Trạng thái: {row.status_class || 'empty'} ({row.raw_status || 'trống'})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-400 font-mono">
                        <div>Ngày thô: <span className="text-slate-200">{row.raw_date}</span></div>
                        <div>
                          Bàn thô (n8n ghi): <span className="text-amber-300">{row.raw_tables || '(trống)'}</span>
                        </div>
                        <div>
                          Bàn App nhận diện: <span className="text-emerald-400 font-bold">
                            {row.parsed_tables && row.parsed_tables.length > 0 ? JSON.stringify(row.parsed_tables) : '❌ Không parse được bàn'}
                          </span>
                        </div>
                        <div>
                          Khớp ngày hiển thị: <span className={row.date_matched ? 'text-emerald-400' : 'text-amber-400'}>
                            {row.date_matched ? '✅ Có khớp' : '⚠️ Lệch ngày'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GAS Code.gs Instructions & Fast Copy Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">MÃ NGUỒN APPS SCRIPT ĐÃ TINH CHỈNH (Code.gs)</h3>
              <p className="text-xs text-slate-400">
                Khớp 100% định dạng 15 cột DATBAN, tự động parse dữ liệu n8n, hỗ trợ đồng thời cả index.html cũ & React App
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-toggle-gas-script"
            onClick={() => setShowGasScript(!showGasScript)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            {showGasScript ? 'Thu gọn' : 'Xem mã Code.gs'}
          </button>
        </div>

        {showGasScript && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800">
              <span className="font-semibold text-cyan-400">Tệp: /google-apps-script/Code.gs</span>
              <button
                type="button"
                id="btn-copy-gas-script"
                onClick={() => {
                  fetch('/google-apps-script/Code.gs')
                    .then((r) => r.text())
                    .then((code) => {
                      navigator.clipboard.writeText(code);
                      onShowToast('Đã sao chép mã', 'Đã copy toàn bộ mã Code.gs vào bộ nhớ tạm. Hãy dán vào Extensions > Apps Script trên Google Sheet!', 'success');
                    })
                    .catch(() => {
                      onShowToast('Thông báo', 'Bạn có thể sao chép trực tiếp từ tệp Code.gs trong thư mục dự án', 'info');
                    });
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao chép mã Code.gs
              </button>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <strong>Các điểm đã được tinh chỉnh tối ưu:</strong><br />
              1. <strong>Định dạng ngày (dd/MM/yyyy):</strong> Tự động bóc tách ngày, tháng, năm độc lập múi giờ Việt Nam, khắc phục triệt để lỗi của JS Date làm lệch ngày khi n8n ghi.<br />
              2. <strong>Chuẩn hóa mã bàn n8n:</strong> Tự động bóc mảng JSON <code className="text-cyan-300">["54"]</code>, <code className="text-cyan-300">["B54"]</code>, chuỗi phẩy, khoảng trắng thành mã bàn hợp lệ.<br />
              3. <strong>Bảo toàn 100% tính tương thích:</strong> Trả về đồng thời cả dạng phẳng <code className="text-cyan-300">Object.keys()</code> cho index.html cũ và cấu trúc <code className="text-cyan-300">statusMap / detailsMap / bookings</code> cho Web App mới.<br />
              4. <strong>15 Cột Sheet DATBAN:</strong> Khớp tuyệt đối thứ tự cột: id_dat, ngay_dat, gio_dat, ten_khach, sdt, so_khach, danh_sach_ban, yeu_cau_ban, dat_mon_truoc, dat_coc, Tien_coc, trang_thai, nguoi_nhap, thoi_gian_nhap, ghi_chu.<br />
              5. <strong>Tự động đồng bộ VIEW_HOMNAY & VIEW_BEP_HOMNAY:</strong> Tự động kiểm tra ngày trong tab DATBAN và DATMON có trùng ngày hôm nay để cập nhật tức thì khi có bàn hoặc món mới.<br />
              6. <strong>Gỡ bỏ Menu Google Sheet:</strong> Bỏ menu tích hợp trên Google Sheet theo yêu cầu để giao diện bảng tính gọn gàng, tự động hóa ngầm không cần bấm menu thủ công.
            </p>
          </div>
        )}
      </div>

      {/* Acceptance Criteria Checklist (Section 8) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">BỘ TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CRITERIA)</h3>
              <p className="text-xs text-slate-400">Kiểm thử 5 Test Cases chuẩn theo tài liệu kỹ thuật</p>
            </div>
          </div>

          <button
            type="button"
            id="btn-reset-demo-data"
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset dữ liệu mẫu
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
            <span className="font-bold text-emerald-400 shrink-0">Test Case 1:</span>
            <div>
              <strong>Đặt bàn thành công (Optimistic UI):</strong> Chọn nút 📅 ĐẶT BÀN &gt; Click chọn bàn 56 & 57 &gt; Bấm TIẾP TỤC ĐẶT BÀN &gt; Điền Tên, SĐT &gt; Xác nhận. Bàn đổi ngay sang màu Đỏ (booked), lưu đơn S8-YYYYMMDD-XXX vào DATBAN.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
            <span className="font-bold text-amber-400 shrink-0">Test Case 2:</span>
            <div>
              <strong>Đổi trạng thái Xác nhận / Đã đến / Hủy:</strong> Nút ✅ XÁC NHẬN đổi sang màu Cam (confirmed); Nút 🏃 ĐÃ ĐẾN đổi sang màu Xanh dương (arrived); Nút ❌ HỦY ĐẶT đổi về màu Vàng (Trống).
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
            <span className="font-bold text-zinc-400 shrink-0">Test Case 3:</span>
            <div>
              <strong>Khóa & Mở khóa bàn:</strong> Chọn nút 🔒 KHÓA/MỞ &gt; Click bàn 10 &gt; Đổi sang màu Xám đen (inactive). Bấm lại lần nữa để mở khóa về màu Vàng (Trống).
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
            <span className="font-bold text-purple-400 shrink-0">Test Case 4:</span>
            <div>
              <strong>Quản lý Đặt món (Menu Management):</strong> Mở đơn S8-20260831-001 &gt; Quản lý món &gt; Thêm "Gỏi khoai môn" (SL: 2), "Lẩu thái" (SL: 1) &gt; Sửa số lượng &gt; Xóa (Soft delete ĐÃ XÓA).
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-start gap-2.5">
            <span className="font-bold text-blue-400 shrink-0">Test Case 5:</span>
            <div>
              <strong>Đồng bộ định kỳ (Polling 20s):</strong> Tự động lấy bản đồ trạng thái bàn mỗi 20s (tắt khi tab ẩn) cập nhật mượt mà không cần F5 trang.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
