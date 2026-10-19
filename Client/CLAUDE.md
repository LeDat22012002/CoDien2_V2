# CLAUDE.md — Client (React + JavaScript + TailwindCSS + Ant Design)

Đọc kèm `../CLAUDE.md`.

## Cấu trúc

```
client/src/
├── modules/
│   └── <moduleName>/          # Trùng tên module ở Server
│       ├── api/               # Hàm gọi API của module
│       ├── components/
│       ├── hooks/
│       └── pages/
├── shared/                    # axiosClient, components, hooks, utils, constants dùng chung
├── layouts/
├── routes/                    # Khai báo route, PrivateRoute
├── stores/                    # State toàn cục (user, quyền)
├── App.jsx
└── main.jsx
```

- Mỗi module tự chứa đủ các thư mục trên. Module không import trực tiếp từ module khác; phần dùng chung đưa vào `shared/`.

## Đặt tên

- Component, page: PascalCase `.jsx`; page có hậu tố `Page`.
- File khác: camelCase `.js`; file API đặt tên `<moduleName>Api.js`.
- Hook: `use` + PascalCase. Hàm xử lý sự kiện: `handle*`. Props callback: `on*`.
- Hằng số: UPPER_SNAKE_CASE.

## Quy tắc code

- Chỉ dùng function component và hooks.
- Gọi API qua `shared/axiosClient` (gắn token, refresh khi 401, chuẩn hóa lỗi). Không gọi axios/fetch trực tiếp trong component.
- Ant Design cho component tương tác; Tailwind cho layout và khoảng cách. Không dùng `!important`, tùy biến AntD qua `ConfigProvider` (locale `vi_VN`).
- Table phân trang phía server, có `rowKey` và trạng thái loading. Xóa và phê duyệt phải có xác nhận.
- Ngày hiển thị `DD/MM/YYYY`, số định dạng kiểu Việt Nam; dùng hàm trong `shared/utils`.
- Ẩn/hiện chức năng theo quyền ở client chỉ để hiển thị; server mới là nơi kiểm tra thật.
- Biến môi trường có tiền tố `VITE_`. Không để `console.log` khi commit.
