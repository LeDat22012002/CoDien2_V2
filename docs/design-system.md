# Design system — Client

> Trạng thái: **bản nháp, chờ duyệt**. Lập từ skill ui-ux-pro-max (Minimalism & Swiss Style, mật độ cao cho dashboard, motion tối thiểu).
> Giá trị thật nằm ở `Client/src/shared/theme/theme.ts`. Đổi màu/font/bo góc thì sửa ở đó, không hardcode trong component.

## Định hướng

- Công cụ làm việc hằng ngày: rõ ràng, nhập liệu nhanh, dữ liệu dễ đọc. Không trang trí, không ảnh nền, không hiệu ứng thừa.
- Bố cục theo lưới, tương phản cao, phân cấp chữ rõ (tiêu đề trang → tiêu đề khối → nội dung).
- Hiệu ứng chỉ để phản hồi thao tác (hover, mở/đóng) trong khoảng 150–250ms; tôn trọng `prefers-reduced-motion`.

## Màu

| Vai trò | Mã | Dùng cho |
|---|---|---|
| Primary | `#1E40AF` | Nút chính, link, mục menu đang chọn |
| Info | `#2563EB` | Thông báo thông tin |
| Accent | `#D97706` | Điểm nhấn hiếm dùng (chỉ số cần chú ý) |
| Text | `#0F172A` | Chữ chính |
| Text secondary | `#475569` | Chữ phụ, mô tả (tương phản ≥ 4.5:1 trên nền trắng) |
| Border | `#94A3B8` | Viền ô nhập (đủ rõ dưới ánh sáng xưởng) |
| Border secondary | `#E2E8F0` | Đường phân cách, viền card |
| Nền trang | `#F1F5F9` | `Layout` |
| Nền khối | `#FFFFFF` | Card, Table, Header |
| Sider | `#0F172A` | Menu bên trái (theme dark) |

Trong Tailwind dùng tên token: `bg-primary`, `text-text-secondary`, `border-border`, `bg-sider`…

## Màu trạng thái

Dùng `StatusTag` (`shared/components`) hoặc `OPERATION_STATUS_META` (`shared/constants/operationStatus.tsx`). Luôn có **icon + chữ**, không chỉ dựa vào màu.

| Trạng thái | Màu | Icon | Chữ mặc định |
|---|---|---|---|
| running | xanh lá `#16A34A` | CheckCircle | Đang chạy |
| stopped | xám | MinusCircle | Dừng |
| warning | cam `#D97706` | ExclamationCircle | Cảnh báo |
| error | đỏ `#DC2626` | CloseCircle | Lỗi |

## Chữ

- Font: **Fira Sans**, có đủ dấu tiếng Việt, đóng gói cùng app (`src/assets/fonts/fira-sans`, khai báo ở `src/shared/theme/fonts.css`) để chạy nội bộ trên IIS không cần internet. Dự phòng `Segoe UI`, Roboto, Arial.
- Cỡ chữ tối thiểu 14px. Tiêu đề trang: `Typography.Title level={4}` (dùng `PageHeader`).
- Số trong bảng canh phải, định dạng bằng `formatNumber`; ngày `DD/MM/YYYY` bằng `formatDate` / `formatDateTime` (`shared/utils/format.ts`).

## Kích thước và khoảng cách

- Bo góc 6px.
- **Chiều cao control (Input, Select, DatePicker, TreeSelect, Button…): 32px khi dùng chuột, 40px trên thiết bị cảm ứng** (`pointer: coarse` → toàn app tự chuyển `componentSize="large"`). Khai báo một chỗ ở `theme.ts` (`controlHeight` / `controlHeightLG`); component không tự đặt `size`, `height` hay class chiều cao riêng cho ô nhập.
- Xem giao diện desktop trong DevTools thì tắt giả lập cảm ứng (chế độ Responsive mặc định là cảm ứng → 40px) và tải lại trang.
- Dropdown của Select / TreeSelect / AutoComplete luôn rộng bằng ô nhập (không dùng `popupMatchSelectWidth={false}`).
- Mục menu cao 44px. Nút chỉ có icon phải có `aria-label`.
- Khoảng cách theo Tailwind: trong khối `gap-2`/`gap-3`, giữa các khối `gap-4`, lề nội dung `p-4` (điện thoại) / `md:p-6`.

## Thanh cuộn

- Dùng chung toàn app, khai báo một chỗ ở `src/index.css`: mảnh (`scrollbar-width: thin`, Safari cũ 6px), thanh xám nhạt `#CBD5E1`, hover `#94A3B8`, nền trong suốt; vùng nền tối (Sider) dùng trắng mờ. Thân bảng (Table) dùng thanh đậm hơn `#94A3B8` (hover `#64748B`) để dễ thấy bảng còn cuộn ngang được.
- Component không tự style thanh cuộn riêng.

## Bảng

- **Độ rộng cột cố định:** mỗi cột khai báo `width` từ `COLUMN_WIDTH` (`shared/constants/tableColumns.ts`): STT 60, mã 110, điện thoại 130, ngày 120, ngày giờ 150, số 120, tag 130, trạng thái 150, họ tên 220, chữ vừa 220, chữ dài 280, thao tác 130. Bảng `tableLayout="fixed"`, `scroll.x = getTableScrollX(columns, screens)` (chỉ cộng cột đang hiện). Bảng rộng hơn tổng thì các cột giãn đều theo tỉ lệ; màn hình hẹp hơn thì cuộn ngang trong bảng.
- **Dòng cao bằng nhau:** ô chỉ 1 dòng (`whitespace-nowrap`), chữ dài cắt "…" và hover hiện đầy đủ. Ô 2 dòng (họ tên + email) thì luôn đủ 2 dòng, thiếu dữ liệu hiện "—".
- **Ngoại lệ — bảng cần đọc kỹ** (Báo cáo sự cố): hiện đầy đủ, không cắt "…"; chữ tự xuống dòng, giữ xuống dòng người nhập gõ, ô canh trên; cột đoạn văn rộng `COLUMN_WIDTH.paragraph` (400). Dòng cao theo nội dung.
- **Khung cao cố định:** bảng danh sách chính chiếm phần còn lại của màn hình, thân bảng cuộn bên trong (`useTableScrollY`), tiêu đề cột và phân trang (`Pagination` của AntD, căn phải) luôn nhìn thấy.

## Layout công khai (`PublicLayout`, kiểu landing page)

- Dùng cho trang chủ "/" và các trang công khai. Không chặn đăng nhập, không có footer.
- Header ngang cao 64px, nền trắng, có bóng. Nội dung rộng tối đa 1400px (`max-w-main`), canh giữa.
- Cuộn quá 80px: hiện thêm header cố định trượt xuống (`animate-slide-down`), giống hệ thống cũ.
- Menu lấy từ trang Area `PUBLIC` (`GET /api/pages/public-menu`). Mục cấp 1 viết hoa, đậm. Liên kết ngoài có icon ↗ và mở tab mới.
- `≥ lg`: logo, menu ngang (dropdown khi hover), ô tìm kiếm bo tròn, nút Đăng nhập hoặc avatar.
- `< lg`: logo, nút tài khoản thu gọn, hamburger 44×44 mở `Drawer` bên phải chứa ô tìm kiếm và menu dọc.
- Avatar có mục "Trang quản trị" (vào trang quản trị đầu tiên user có quyền) và "Đăng xuất".

## Layout sau đăng nhập (`PrivateLayout`: quản trị, thông tin cá nhân)

- Đầu Sider: logo Hòa Phát trên dải trắng cao bằng header; Sider thu gọn thì chỉ còn biểu tượng (`LogoHP.png`). Điện thoại: logo nằm trên header.

- `< md` (điện thoại): menu nằm trong `Drawer`, mở bằng nút hamburger ở header.
- `md – lg` (tablet): `Sider` thu gọn còn icon.
- `≥ lg` (laptop trở lên): `Sider` mở rộng 240px, có nút thu gọn.
- Đầu mỗi trang dùng `PageHeader` (tiêu đề + mô tả + nút hành động; nút xuống dòng trên điện thoại).

## Trạng thái màn hình

Mỗi màn hình xử lý đủ:

- **Loading:** `Table loading`, `Skeleton` hoặc `Spin`; tải cả trang dùng `FullPageLoading`.
- **Rỗng:** `Empty` của AntD kèm câu hướng dẫn việc cần làm tiếp.
- **Lỗi:** `ErrorState` (thông báo lỗi từ Server + nút Thử lại). Lỗi validate gắn vào từng ô bằng `applyServerErrors`.
- **Thông báo kết quả thao tác** (lưu, xóa, đăng nhập thất bại…): toast góc trên phải qua `notify` (React Toastify), font và màu theo theme.
- **Đang xử lý chặn thao tác** (đăng nhập…): `LoadingOverlay`: phủ mờ toàn màn hình, spinner màu primary, chữ mô tả.
