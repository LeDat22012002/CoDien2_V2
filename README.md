# Phần mềm nội bộ Nhà máy Cơ điện 2

- `Server/` — .NET 8 Web API + SQL Server (database `NM_CD2`)
- `Client/` — React + TypeScript

Deploy lên IIS trong mạng nội bộ (2 site FE / BE theo IP và cổng tùy chỉnh): xem [docs/deploy-iis.md](docs/deploy-iis.md).

## Cấu hình Server

`Server/appsettings.json` trong repo **không chứa secret**: chuỗi kết nối DB và `Jwt:SecretKey` để rỗng. Mỗi máy tự khai báo giá trị thật theo môi trường:

| Môi trường | Lấy cấu hình từ |
|---|---|
| Máy dev (chạy từ Visual Studio / `dotnet run`) | User Secrets |
| Máy chủ IIS | `appsettings.Production.json` đặt trên máy chủ, hoặc biến môi trường |

Các khóa bắt buộc:

| Khóa | Ý nghĩa |
|---|---|
| `ConnectionStrings:DefaultConnection` | Chuỗi kết nối SQL Server |
| `Jwt:SecretKey` | Khóa ký JWT, chuỗi ngẫu nhiên ≥ 32 ký tự |
| `Identity:SuperAdmin:EmpCode` | Mã nhân viên của admin tổng đầu tiên |
| `Identity:SuperAdmin:InitialPassword` | Mật khẩu ban đầu của admin tổng (chỉ dùng khi DB chưa có SUPER_ADMIN nào) |

Chuỗi kết nối mẫu:

```
Server=<tên máy hoặc IP>[\<tên instance>];Database=NM_CD2;User Id=<login>;Password=<mật khẩu>;TrustServerCertificate=True;MultipleActiveResultSets=True
```

### Máy dev: cài lần đầu sau khi clone

User Secrets lưu ngoài thư mục dự án, không lên GitHub, nên mỗi máy phải khai báo một lần. Chạy tại thư mục `Server/`:

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=...;Database=NM_CD2;User Id=...;Password=...;TrustServerCertificate=True;MultipleActiveResultSets=True"
dotnet user-secrets set "Jwt:SecretKey" "<chuỗi ngẫu nhiên dài>"
dotnet user-secrets set "Identity:SuperAdmin:EmpCode" "<mã nhân viên>"
dotnet user-secrets set "Identity:SuperAdmin:InitialPassword" "<mật khẩu>"
```

Giá trị được lưu tại `%APPDATA%\Microsoft\UserSecrets\9e75b215-35de-400f-bed3-ad0317ff56ee\secrets.json` (thư mục `AppData` bị Windows ẩn). Trong Visual Studio có thể mở file này bằng: chuột phải project **Server** → **Manage User Secrets**.

### Máy dev: đổi chuỗi kết nối DB

Khi đổi máy chủ SQL, đổi database, đổi tài khoản hoặc mật khẩu SQL:

1. Xem giá trị hiện tại (tại thư mục `Server/`):
   ```powershell
   dotnet user-secrets list
   ```
2. Ghi đè bằng chuỗi mới (lệnh `set` thay giá trị cũ, không cần xóa trước):
   ```powershell
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=192.168.1.20;Database=NM_CD2;User Id=...;Password=...;TrustServerCertificate=True;MultipleActiveResultSets=True"
   ```
   Hoặc sửa thẳng file `secrets.json` qua **Manage User Secrets**.
3. Dừng và chạy lại Server — cấu hình chỉ được đọc khi khởi động.

**Không** sửa chuỗi kết nối trong `appsettings.json`: khi chạy Development, User Secrets đè lên `appsettings.json` nên sửa ở đó không có tác dụng, và commit file đó sẽ đưa mật khẩu lên GitHub.

Nếu DB mới chưa có bảng do EF tạo, chạy migration tại thư mục `Server/`:

```powershell
dotnet ef database update
```

### Máy chủ IIS

User Secrets **không** được nạp trên IIS (IIS chạy môi trường `Production`). Chọn một trong hai cách:

**Cách 1 — `appsettings.Production.json` (khuyên dùng).** Tạo file này trong thư mục deploy trên máy chủ, cạnh `Server.dll`, không để trong source code:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=NM_CD2;User Id=...;Password=...;TrustServerCertificate=True;MultipleActiveResultSets=True"
  },
  "Jwt": { "SecretKey": "<chuỗi ngẫu nhiên dài, khác máy dev>" },
  "Identity": {
    "SuperAdmin": { "EmpCode": "<mã nhân viên>", "InitialPassword": "<mật khẩu>" }
  },
  "Cors": { "AllowedOrigins": [ "http://<địa chỉ client>" ] }
}
```

- File này đè lên `appsettings.json`, không cần sửa code.
- Khi publish **không bật** "Remove additional files at destination" (Delete existing files), nếu không file sẽ bị xóa. Nên giữ một bản sao.
- Đổi chuỗi kết nối: sửa file rồi Recycle Application Pool (hoặc `iisreset`).

**Cách 2 — Biến môi trường.** IIS Manager → chọn site → **Configuration Editor** → section `system.webServer/aspNetCore`, ô **From** chọn `ApplicationHost.config <location path='...'>` (không chọn `web.config` vì publish sẽ ghi đè), thêm vào `environmentVariables`:

```
ConnectionStrings__DefaultConnection = Server=...;Database=NM_CD2;...
Jwt__SecretKey                       = ...
```

Dấu `__` (hai gạch dưới) thay cho dấu `:`.

### Khi SQL Server nằm ở máy khác

Trên máy chứa SQL Server:

- SQL Server Configuration Manager → bật **TCP/IP**, restart service SQL Server.
- Windows Firewall mở cổng TCP **1433**; dùng instance có tên (vd `SQLEXPRESS`) thì mở thêm UDP **1434** và bật service **SQL Server Browser**.
- Bật **SQL Server and Windows Authentication mode** (Mixed mode).
- Nên tạo login SQL riêng chỉ có quyền trên `NM_CD2` cho ứng dụng, không dùng `sa`.

Chuỗi kết nối dùng tên máy hoặc IP của máy đó, vd `Server=192.168.1.20` hoặc `Server=192.168.1.20\SQLEXPRESS`.
