# Triển khai tối ưu hiệu suất SODOBA

## Phạm vi đã thực hiện

- Giữ nguyên quy tắc đặt bàn, trạng thái bàn, sinh mã đơn/món và cấu trúc 15 cột.
- Ghi trạng thái và thêm nhiều món theo lô.
- Cho phép POST trả kết quả trước và cập nhật VIEW bằng request nền (`defer_views`).
- Cache dữ liệu động 15 giây; cache danh mục món 300 giây.
- Tự vô hiệu hóa cache sau mọi POST thành công và khi Sheet được chỉnh sửa trực tiếp.
- Nút đồng bộ thủ công dùng `force_refresh=true` để bỏ qua cache.
- `GET_ALL_DATMON` hỗ trợ `date` và `id_dats`; chế độ không có bộ lọc vẫn trả toàn bộ dữ liệu.
- Nếu CacheService lỗi hoặc payload vượt 95 KB, GAS tự đọc Sheet như trước.

## File GAS cần triển khai

Sử dụng `public/google-apps-script/Code.gs`. Không ghép từng đoạn vào phiên bản cũ.

## Các bước triển khai an toàn

1. Mở dự án Apps Script đang phục vụ deployment mới.
2. Vào **Project history** hoặc tạo một version hiện tại để có điểm rollback.
3. Sao chép toàn bộ nội dung `public/google-apps-script/Code.gs` vào file `Code.gs` của Apps Script.
4. Chọn **Deploy → Manage deployments**.
5. Chọn deployment tương ứng, bấm **Edit**.
6. Chọn **New version**, sau đó **Deploy**.
7. Không xóa deployment/version cũ.

## Kiểm tra ngay sau triển khai

1. GET đầu tiên với `date=YYYY-MM-DD&force_refresh=true` phải có `cache_hit: false`.
2. GET cùng ngày ngay sau đó, không có `force_refresh`, phải có `cache_hit: true` nếu payload dưới 95 KB.
3. POST `UPDATE_MENU` bằng một `id_mon` chắc chắn không tồn tại và `defer_views: true` phải trả `views_deferred: true`; phép thử này không sửa dữ liệu.
4. Chạy bộ manual test và benchmark trong thư mục `scripts/`.
5. Chỉ sau khi các bước trên đạt mới chạy một đơn thử nghiệm có thể đánh dấu HỦY.

## Điều kiện rollback

Rollback ngay nếu xảy ra một trong các trường hợp:

- Thiếu hoặc sai đơn/bàn/món so với DATBAN, DATMON.
- Sinh trùng mã đơn hoặc mã món.
- Dời/nối bàn làm mất liên kết món.
- VIEW không đồng bộ sau 10 giây.
- n8n hoặc luồng bếp không đọc được dữ liệu.

Để rollback, vào **Manage deployments → Edit**, chọn lại version trước đó và deploy. URL Web App được giữ nguyên.

## Kỳ vọng hiệu suất

- Giao diện có cache trình duyệt: dưới 150 ms.
- GET GAS khi cache máy chủ còn hiệu lực: nhanh hơn rõ rệt so với đọc lại toàn bộ Sheet.
- POST không còn chờ dựng hai VIEW khi client gửi `defer_views: true`.
- Đồng bộ thủ công luôn lấy dữ liệu mới trực tiếp từ Sheet.

Số đo cuối cùng phải được lấy lại sau khi file GAS mới đã được deploy; kết quả trước thời điểm đó chỉ phản ánh backend cũ.
