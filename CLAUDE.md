# CLAUDE.md — Phần mềm nội bộ Nhà máy Cơ điện 2

Quy ước riêng: `server/CLAUDE.md`, `client/CLAUDE.md`. Làm việc ở thư mục nào thì đọc thêm file của thư mục đó.

## Công nghệ

- **Server:** .NET 8 Web API, EF Core, SQL Server, JWT
- **Client:** React (TypeScript), TailwindCSS, Ant Design, Axios, React Router, Zudtan, React query ...

## Cấu trúc

```
/
├── server/    # Gateway + API, chia theo module
├── client/    # React, chia theo module
└── docs/      # Tài liệu nghiệp vụ, CSDL, API
```

- **Mỗi chức năng là 1 module.** Tên module ở Server và Client phải trùng nhau (Server PascalCase, Client camelCase).
- Code dùng chung đặt trong `Shared` (server) / `shared` (client), không đặt trong module.

## Quy ước chung

- **Tên file, thư mục, hàm, biến, class, bảng, cột, endpoint: tiếng Anh.** Không dùng tiếng Việt hay viết tắt tiếng Việt.
- **Text hiển thị cho người dùng:** tiếng Việt có dấu.
- Hàm: động từ đứng đầu (`get`, `create`, `update`, `delete`); hàm trả về bool bắt đầu bằng `is` / `has` / `can`.
- Endpoint: `/api/<module>`, kebab-case, danh từ số nhiều.
- JSON camelCase. Response chung: `{ success, message, data, errors }`; danh sách phân trang: `data: { items, totalCount, pageIndex, pageSize }`.
- Ngày giờ truyền dạng ISO 8601.

## Từ điển thuật ngữ

Dùng thống nhất trong toàn dự án, bổ sung khi phát sinh:

Nhà máy = Factory · Phân xưởng = Workshop · Phòng ban = Department · Nhân viên = Employee · Thiết bị = Equipment · Vật tư = Material · Kho = Warehouse · Phiếu nhập = GoodsReceipt · Phiếu xuất = GoodsIssue · Bảo trì = Maintenance · Sửa chữa = Repair · Sự cố = Incident · Lệnh sản xuất = ProductionOrder · Kế hoạch = Plan · Ca làm việc = Shift · Chấm công = Attendance · Đơn vị tính = Unit · Nhà cung cấp = Supplier · Phê duyệt = Approval · Người dùng / Vai trò / Quyền = User / Role / Permission

## Git & bảo mật

- Nhánh: `main`, `develop`, `feature/*`, `fix/*`. Commit: `feat|fix|refactor|docs|chore: mô tả`.
- Không commit secret, `.env`, `appsettings.*.json` có mật khẩu, `node_modules`, `bin/`, `obj/`.
- Mọi API mặc định phải xác thực và kiểm tra quyền. Ngoại lệ: đăng nhập và các API công khai (dữ liệu cho trang Home…) — gắn `[AllowAnonymous]` trên từng action, chỉ cho thao tác đọc (GET); thêm/sửa/xóa luôn bắt buộc đăng nhập.

## Cách Claude làm việc

- Trả lời bằng tiếng Việt.
- Đọc code hiện có và theo pattern sẵn có. Không tự thêm thư viện mới khi chưa hỏi.
- Thay đổi CSDL chỉ qua EF Core Migration.
- Thêm chức năng mới theo thứ tự: Server module → Client module.
- Nghiệp vụ chưa rõ thì hỏi lại, không tự đoán.
