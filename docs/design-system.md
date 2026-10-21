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

- Bo góc 6px. Control cao 36px; trên thiết bị cảm ứng (`pointer: coarse`) toàn app tự chuyển `componentSize="large"` (44px).
- Mục menu cao 44px. Nút chỉ có icon phải có `aria-label` và vùng bấm ≥ 44×44px.
- Khoảng cách theo Tailwind: trong khối `gap-2`/`gap-3`, giữa các khối `gap-4`, lề nội dung `p-4` (điện thoại) / `md:p-6`.

## Layout

- `< md` (điện thoại): menu nằm trong `Drawer`, mở bằng nút hamburger ở header.
- `md – lg` (tablet): `Sider` thu gọn còn icon.
- `≥ lg` (laptop trở lên): `Sider` mở rộng 240px, có nút thu gọn.
- Đầu mỗi trang dùng `PageHeader` (tiêu đề + mô tả + nút hành động; nút xuống dòng trên điện thoại).

## Trạng thái màn hình

Mỗi màn hình xử lý đủ:

- **Loading:** `Table loading`, `Skeleton` hoặc `Spin`; tải cả trang dùng `FullPageLoading`.
- **Rỗng:** `Empty` của AntD kèm câu hướng dẫn việc cần làm tiếp.
- **Lỗi:** `ErrorState` (thông báo lỗi từ Server + nút Thử lại). Lỗi validate gắn vào từng ô bằng `applyServerErrors`.
