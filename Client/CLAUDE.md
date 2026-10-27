# CLAUDE.md — Client (React + TypeScript + Tailwind CSS + Ant Design)

@../CLAUDE.md

## Ngữ cảnh

- Web nội bộ cho công ty/nhà máy: dashboard quản trị và các màn hình nghiệp vụ.
- Người dùng dùng hằng ngày, thao tác lặp lại nhiều: nhân viên văn phòng, quản lý, tổ trưởng. Một số màn hình dùng trên tablet ở xưởng.
- Ưu tiên rõ ràng, nhập liệu nhanh, dễ đọc dữ liệu; không trang trí rườm rà.
- Giao diện hoàn toàn bằng tiếng Việt.

## Cấu trúc

```
src/
├── modules/
│   └── <moduleName>/          # Trùng tên module ở Server
│       ├── api/               # Hàm gọi API của module
│       ├── components/
│       ├── constants/         # Hằng số riêng của module (khi cần)
│       ├── hooks/
│       ├── pages/
│       ├── types/             # Interface/type của module: dữ liệu API, request, payload (props component để trong component)
│       └── utils/             # Hàm tiện ích riêng của module (khi cần)
├── shared/                    # axiosClient, components, hooks, utils, constants dùng chung
├── layouts/
├── routes/                    # Khai báo route, PrivateRoute
├── stores/                    # State toàn cục (user, quyền)
├── App.tsx
└── main.tsx
```

- Mỗi module tự chứa đủ các thư mục trên.
- Module không import trực tiếp từ module khác; phần dùng chung đưa vào `shared/`.

## Đặt tên

- Component, page: PascalCase `.tsx`; page có hậu tố `Page` (vd. `ProductionOrderListPage.tsx`).
- File khác: camelCase `.ts`; file API đặt tên `<moduleName>Api.ts`.
- Hook: `use` + PascalCase. Hàm xử lý sự kiện: `handle*`. Props callback: `on*`.
- Hằng số: UPPER_SNAKE_CASE.

## Quy tắc code

- Chỉ dùng arrow function component và hooks. Props và dữ liệu API phải có type, không dùng `any`.
- Gọi API qua `shared/axiosClient` (gắn token, refresh khi 401, chuẩn hóa lỗi). Không gọi axios/fetch trực tiếp trong component.
- Biến môi trường có tiền tố `VITE_`. Không để `console.log` khi commit.
- Ẩn/hiện chức năng theo quyền ở client chỉ để hiển thị; server mới là nơi kiểm tra thật.

## UI/UX

- Ant Design cho component tương tác; Tailwind cho layout và khoảng cách. Không dùng thư viện UI khác, không dùng `!important`.
- Ngoại lệ: thông báo toast dùng React Toastify, gọi qua `notify` (`shared/utils/notify.ts`; lỗi API dùng `notify.apiError(error)`), không import thẳng `react-toastify` và không dùng `message`/`notification` của AntD. Lớp phủ chờ toàn màn hình dùng `LoadingOverlay` (`shared/components`).
- Tùy biến giao diện AntD qua `ConfigProvider` (locale `vi_VN`, theme token). Màu, bo góc, font khai báo một chỗ ở theme, không hardcode rải rác trong component.
- Khi tạo hoặc sửa giao diện, luôn dùng skill ui-ux-pro-max trước khi viết code. Lấy từ skill phần định hướng (style, bảng màu, typography, UX guideline) rồi áp vào AntD + Tailwind, không dựng lại component bằng thư viện khác.
- Design system đã duyệt lưu ở `docs/design-system.md`; các màn hình sau bám theo file này.
- Font phải hỗ trợ đầy đủ dấu tiếng Việt.
- Màu trạng thái (chạy / dừng / cảnh báo / lỗi) dùng nhất quán toàn app, kèm icon hoặc chữ, không chỉ dựa vào màu.
- Màn hình dùng ở xưởng: nút và vùng bấm đủ lớn cho cảm ứng, chữ đủ lớn, độ tương phản cao.
- Mỗi màn hình phải xử lý đủ các trạng thái: loading, rỗng, lỗi.

## Responsive

- Thiết kế mobile-first: viết style mặc định cho màn hình nhỏ, mở rộng dần bằng breakpoint của Tailwind (`sm`, `md`, `lg`, `xl`).
- Các mốc cần kiểm tra: điện thoại (~375px), tablet (~768px), laptop (~1280px), màn hình lớn (≥1536px).
- Không dùng chiều rộng/chiều cao cố định bằng px cho layout; dùng `flex`, `grid`, `%`, `min/max-width`.
- Không để trang bị cuộn ngang. Phần rộng (bảng, biểu đồ) cuộn trong container riêng.
- Layout chung: `Sider` của AntD thu gọn theo `breakpoint="lg"`; trên màn hình nhỏ menu chuyển thành `Drawer` mở bằng nút hamburger ở header.
- Lưới nội dung dùng `Row`/`Col` của AntD với các prop `xs`, `sm`, `md`, `lg`, `xl`, hoặc `grid` của Tailwind. Dùng `Grid.useBreakpoint()` khi cần đổi hành vi theo kích thước (không viết logic riêng đo `window.innerWidth`).
- Table: mọi cột có `width` lấy từ `COLUMN_WIDTH` (`shared/constants/tableColumns.ts`, thiếu loại thì bổ sung ở đó), bảng dùng `tableLayout="fixed"` và `scroll={{ x: getTableScrollX(columns, Grid.useBreakpoint()) }}`. Ô chỉ 1 dòng, chữ dài cắt "…" bằng `Typography.Text ellipsis={{ tooltip }}` để hover xem đủ. Cột ít quan trọng ẩn bằng `responsive: ['md']`. Trên điện thoại, danh sách dài có thể hiển thị dạng card thay cho bảng.
- Bảng danh sách chính của trang: khung cao cố định vừa màn hình, thân bảng cuộn bên trong bằng `useTableScrollY` (`shared/hooks`), phân trang AntD `Pagination` đặt dưới khung.
- Form: một cột trên điện thoại, nhiều cột từ `md` trở lên. Input, Select, DatePicker rộng `100%`.
- Modal: trên điện thoại rộng gần toàn màn hình (hoặc dùng `Drawer`), nội dung dài phải cuộn được; nút hành động luôn nhìn thấy.
- Chiều cao control chung: 32px khi dùng chuột, 40px trên cảm ứng (khai báo ở `theme.ts`, không đặt `size`/chiều cao riêng cho ô nhập trong component). Khoảng cách giữa các nút đủ rộng để không bấm nhầm.
- Cỡ chữ không nhỏ hơn 14px; ảnh và biểu đồ co giãn theo container.
- Mỗi trang mới phải được kiểm tra ở cả 3 kích thước (điện thoại, tablet, desktop) trước khi coi là xong.

## Bảng và form

- Table phân trang phía server, có `rowKey` và trạng thái loading; có tìm kiếm, lọc, sắp xếp khi dữ liệu nhiều.
- Form dùng AntD `Form` với validate rõ ràng, thông báo lỗi dễ hiểu.
- Xóa và phê duyệt phải có xác nhận.

## Định dạng hiển thị

- Ngày hiển thị `DD/MM/YYYY`, số định dạng kiểu Việt Nam; dùng hàm trong `shared/utils`, không tự format rải rác.
