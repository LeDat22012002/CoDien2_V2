# Deploy lên IIS (mạng LAN nội bộ, IP + port tùy chỉnh)

Hướng dẫn đưa phần mềm lên một máy chủ Windows chạy IIS trong mạng nội bộ, **không cần Internet**, gồm 2 site:

| Site | Nội dung | Địa chỉ ví dụ |
|---|---|---|
| **FE** (Client) | File tĩnh React đã build | `http://192.168.1.10:8080` |
| **BE** (Server) | .NET 8 Web API | `http://192.168.1.10:8081` |

Trong tài liệu dùng IP `192.168.1.10`, cổng FE `8080`, cổng BE `8081`. Khi làm thật thì **thay bằng IP và cổng của bạn ở mọi chỗ**.

> **Quy tắc quan trọng:** người dùng phải mở FE bằng **đúng host** mà FE dùng để gọi BE. Ví dụ FE gọi BE theo IP `192.168.1.10` thì người dùng cũng mở `http://192.168.1.10:8080`. Nếu mở FE bằng tên máy (`http://srv-nmcd2:8080`) trong khi FE gọi BE bằng IP, cookie đăng nhập sẽ không được gửi: đăng nhập vẫn thành công nhưng bấm F5 là bị đăng xuất.

---

## 1. Chuẩn bị máy chủ (làm 1 lần)

Máy chủ không có Internet nên cần tải sẵn các bộ cài offline từ máy khác rồi chép sang.

### 1.1. Bật IIS

**Server Manager** → *Add Roles and Features* → **Web Server (IIS)**, chọn các mục sau:

- Common HTTP Features: **Default Document**, **Static Content**, **HTTP Errors**
- Security: **Request Filtering**
- Health and Diagnostics: **HTTP Logging**
- **Không** chọn **WebDAV Publishing**. Nếu đã cài thì gỡ ra, vì WebDAV chặn lệnh PUT/DELETE của API và gây lỗi 405 khi sửa hoặc xóa dữ liệu.

### 1.2. Cài 2 bộ cài bắt buộc

| Bộ cài | Dùng cho | Tải ở |
|---|---|---|
| **ASP.NET Core 8.0 Runtime – Hosting Bundle** | Chạy BE trên IIS | dotnet.microsoft.com → .NET 8.0 → *Hosting Bundle* |
| **IIS URL Rewrite Module 2.1** (x64) | FE: F5 ở trang con không bị 404 | iis.net/downloads/microsoft/url-rewrite |

Cài xong thì mở **cmd (Run as administrator)** và chạy `iisreset`.

### 1.3. Múi giờ

Một số giờ (nhập báo cáo, lấy số văn bản, đăng nhập gần nhất, nhật ký) được lưu theo **giờ của máy chủ**. Vì vậy máy chủ phải đặt **(UTC+07:00) Bangkok, Hanoi, Jakarta**.

### 1.4. Mở cổng tường lửa

Mở **PowerShell (Run as administrator)**:

```powershell
New-NetFirewallRule -DisplayName "NMCD2 FE 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
New-NetFirewallRule -DisplayName "NMCD2 BE 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

### 1.5. Thư mục

Ví dụ:

```
D:\Sites\NMCD2\api\     ← BE (Server)
D:\Sites\NMCD2\web\     ← FE (Client)
D:\Uploads\             ← ảnh tải lên (FileStorage:RootPath), nằm ngoài thư mục site để deploy lại không mất
```

---

## 2. Build trên máy dev

### 2.1. Build BE

Tại thư mục `Server/`:

```powershell
dotnet publish -c Release -o ..\publish\api
```

Kết quả nằm ở `publish\api\`, gồm `Server.dll`, `web.config`…

### 2.2. Build FE

Địa chỉ BE được **gắn cố định vào bản build**, nên phải khai báo trước khi build. Tạo file `Client/.env.production.local` (file này đã nằm trong `.gitignore`, không bị commit):

```
VITE_API_BASE_URL=http://192.168.1.10:8081/api
```

Tại thư mục `Client/`:

```powershell
npm ci
npm run build
```

Kết quả nằm ở `Client\dist\`. Thư mục này đã có sẵn `web.config` (lấy từ `public/web.config`) để IIS trả về `index.html` cho mọi đường dẫn của React.

> Sau này đổi IP hoặc cổng BE thì phải sửa file này và **build lại FE**.

### 2.3. Script cập nhật CSDL

Máy chủ không có `dotnet ef` nên tạo sẵn file SQL. Tại thư mục `Server/`:

```powershell
dotnet ef migrations script --idempotent -o ..\publish\migrate.sql
```

`--idempotent` nghĩa là script tự bỏ qua các migration DB đã có, nên chạy lại nhiều lần vẫn an toàn.

---

## 3. Cơ sở dữ liệu

1. Mở SSMS, kết nối SQL Server, chọn database **NM_CD2**, mở `migrate.sql` rồi bấm **Execute**.
2. Tạo login SQL riêng cho ứng dụng (không dùng `sa`), chỉ cấp quyền trên `NM_CD2` (`db_datareader`, `db_datawriter`).
3. Nếu SQL Server nằm ở máy khác, xem mục "Khi SQL Server nằm ở máy khác" trong [README](../README.md).

Các script trong `Server/Data/Scripts/` chạy **sau khi BE đã khởi động ít nhất 1 lần**, vì lúc khởi động seeder mới thêm quyền mới vào DB. Chỉ chạy script nào cần (xem chú thích đầu mỗi file). Có thể chạy bằng SSMS (chọn DB `NM_CD2` rồi Execute), hoặc bằng sqlcmd. Khi dùng sqlcmd thì luôn thêm `-I -f 65001`:

```powershell
sqlcmd -S <server> -d NM_CD2 -E -I -f 65001 -i AddAuditLogAdminPage.sql
```

---

## 4. Tạo site BE (Server)

### 4.1. Chép file

Chép toàn bộ `publish\api\` vào `D:\Sites\NMCD2\api\`.

### 4.2. Cấu hình `appsettings.Production.json`

Tạo file này **trên máy chủ**, đặt cạnh `Server.dll`, và **không** đưa vào source code:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=<máy SQL>;Database=NM_CD2;User Id=<login>;Password=<mật khẩu>;TrustServerCertificate=True;MultipleActiveResultSets=True"
  },
  "Jwt": { "SecretKey": "<chuỗi ngẫu nhiên ≥ 32 ký tự, khác máy dev>" },
  "Identity": {
    "SuperAdmin": { "EmpCode": "<mã nhân viên admin tổng>", "InitialPassword": "<mật khẩu ban đầu>" }
  },
  "Cors": { "AllowedOrigins": [ "http://192.168.1.10:8080" ] },
  "FileStorage": { "RootPath": "D:/Uploads" }
}
```

- `Cors:AllowedOrigins` phải là **chính xác địa chỉ FE**: đúng `http`, đúng IP, đúng cổng, **không** có `/` ở cuối. Người dùng mở FE bằng nhiều địa chỉ thì liệt kê đủ cả (và xem lại quy tắc ở đầu tài liệu).
- Tạo `Jwt:SecretKey` ngẫu nhiên bằng PowerShell:
  ```powershell
  $bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [Convert]::ToBase64String($bytes)
  ```
- Các cấu hình có thể đổi khi cần:

  | Khóa | Ý nghĩa | Mặc định |
  |---|---|---|
  | `Identity:RememberMeDays` | Số ngày giữ đăng nhập khi tick "Nhớ mật khẩu" | 30 |
  | `AuditLog:RetentionDays` | Số ngày giữ nhật ký hệ thống | 30 |
  | `RateLimit:PermitLimit` | Số request mỗi người được gửi trong 1 phút | 100 |

### 4.3. Application Pool

IIS Manager → **Application Pools** → **Add Application Pool**:

- Name: `NMCD2-API`
- .NET CLR version: **No Managed Code**
- Managed pipeline mode: Integrated

Sau đó chọn pool → **Advanced Settings**:

- **Start Mode** = `AlwaysRunning`, để BE luôn chạy và việc tự xóa nhật ký cũ chạy đúng hằng ngày.
- **Idle Time-out (minutes)** = `0`.

### 4.4. Site

IIS Manager → **Sites** → **Add Website**:

- Site name: `NMCD2-API`
- Application pool: `NMCD2-API`
- Physical path: `D:\Sites\NMCD2\api`
- Binding: Type `http`, IP address `192.168.1.10`, Port `8081`, Host name **để trống**

Sau đó chọn site → **Advanced Settings** → **Preload Enabled** = `True`.

### 4.5. Quyền thư mục ảnh

App pool cần quyền ghi vào thư mục ảnh: chuột phải `D:\Uploads` → Properties → Security → Edit → Add, nhập `IIS AppPool\NMCD2-API` → cấp quyền **Modify**.

### 4.6. Kiểm tra BE

Trên máy khác trong LAN, mở trình duyệt vào:

```
http://192.168.1.10:8081/api/pages/public-menu
```

Nếu thấy JSON dạng `{"success":true,...}` là BE đã chạy và kết nối được DB.

---

## 5. Tạo site FE (Client)

### 5.1. Chép file

Chép toàn bộ **nội dung** của `Client\dist\` vào `D:\Sites\NMCD2\web\`, sao cho `index.html` và `web.config` nằm ngay trong `web\`.

### 5.2. Application Pool và site

- Application Pool: Name `NMCD2-WEB`, .NET CLR version **No Managed Code**.
- **Add Website**:
  - Site name: `NMCD2-WEB`
  - Application pool: `NMCD2-WEB`
  - Physical path: `D:\Sites\NMCD2\web`
  - Binding: `http`, IP `192.168.1.10`, Port `8080`, Host name để trống

### 5.3. Kiểm tra FE

1. Mở `http://192.168.1.10:8080`. Trang Lấy số văn bản phải hiện ra kèm menu.
2. Vào một trang con, ví dụ `http://192.168.1.10:8080/incidents`, rồi bấm F5. Trang vẫn hiện bình thường, không báo 404.
3. Đăng nhập bằng admin tổng (`Identity:SuperAdmin`), bấm F5, vẫn còn đăng nhập. Sau đó **đổi mật khẩu admin ngay**.
4. Đổi ảnh đại diện ở Thông tin cá nhân, ảnh phải hiện ra.

---

## 6. Cập nhật phiên bản mới

### BE

1. Build lại theo mục 2.1, và mục 2.3 nếu có migration mới.
2. Chạy `migrate.sql` mới trên DB.
3. Dừng BE: tạo file rỗng tên `app_offline.htm` trong `D:\Sites\NMCD2\api\` (IIS tự dừng app và nhả file `.dll`). Hoặc Stop site `NMCD2-API`.
4. Chép đè các file mới. **Không** xóa `appsettings.Production.json`.
5. Xóa `app_offline.htm` (hoặc Start lại site).
6. Nếu bản mới có script trong `Data/Scripts/` thì chạy sau bước này.

### FE

1. Build lại theo mục 2.2.
2. Xóa nội dung cũ trong `D:\Sites\NMCD2\web\` rồi chép `dist\` mới vào. Không cần dừng site.
3. `index.html` được cấu hình không lưu cache, nên người dùng nhận bản mới ngay khi tải lại trang.

---

## 7. Đổi IP hoặc cổng

| Đổi | Việc cần làm |
|---|---|
| Cổng / IP của **BE** | Sửa binding site `NMCD2-API` → sửa `VITE_API_BASE_URL` → **build lại FE** và chép lên → mở cổng tường lửa mới |
| Cổng / IP của **FE** | Sửa binding site `NMCD2-WEB` → sửa `Cors:AllowedOrigins` trong `appsettings.Production.json` → Recycle pool `NMCD2-API` → mở cổng tường lửa mới |
| Đổi IP máy chủ | Làm cả hai dòng trên |

---

## 8. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| FE báo **HTTP 500.19** | Chưa cài **URL Rewrite Module** (mục 1.2). |
| BE báo **HTTP 500.19** hoặc **500.21** | Chưa cài **Hosting Bundle**, hoặc cài trước khi bật IIS. Cài lại Hosting Bundle rồi chạy `iisreset`. |
| BE báo **HTTP 500.30** (app không khởi động) | Thiếu hoặc sai `appsettings.Production.json` (chuỗi kết nối, `Jwt:SecretKey`), hoặc không kết nối được SQL. Xem log: trong `web.config` của BE đổi `stdoutLogEnabled="true"`, tạo thư mục `logs` cạnh `Server.dll` và cấp quyền ghi cho `IIS AppPool\NMCD2-API`. Tải lại trang rồi đọc file trong `logs\`. Xem xong nhớ tắt lại. |
| F5 ở trang con của FE báo **404** | Thiếu `web.config` trong thư mục FE, hoặc chưa cài URL Rewrite. |
| Console trình duyệt báo lỗi **CORS** | `Cors:AllowedOrigins` không khớp **chính xác** địa chỉ đang mở FE (http/https, IP hay tên máy, cổng, thừa dấu `/`). Sửa xong thì Recycle pool BE. |
| Đăng nhập được nhưng **F5 bị đăng xuất** | Người dùng mở FE bằng host khác với host trong `VITE_API_BASE_URL` (tên máy so với IP). Dùng thống nhất một địa chỉ. |
| Sửa hoặc xóa dữ liệu báo **405 Method Not Allowed** | WebDAV đang bật, gỡ **WebDAV Publishing** (mục 1.1). |
| Ảnh đại diện không lưu được | App pool BE chưa có quyền ghi `D:\Uploads` (mục 4.5). |
| Import Excel lớn báo **413** | File vượt giới hạn 20MB của ứng dụng. Chia nhỏ file. |
| Giờ hiển thị lệch 7 tiếng | Máy chủ chưa đặt múi giờ UTC+07:00 (mục 1.3). |
