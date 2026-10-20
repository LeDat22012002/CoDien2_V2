# CLAUDE.md — Server (.NET 8 Web API + SQL Server)

Đọc kèm `../CLAUDE.md`.

## Cấu trúc (Modular, 1 project)

```
server/
├── Server.sln, Server.csproj
├── appsettings*.json, Properties/launchSettings.json
├── Api/                  # Host: Program.cs, Middlewares/, Extensions/ (AddData, AddModules, AddApiControllers)
├── Gateway/              # Điểm vào duy nhất: JWT, CORS, rate limit, fallback policy bắt buộc đăng nhập
├── Modules/
│   └── <ModuleName>/
│       ├── Controllers/        # <Entity>sController.cs
│       ├── DTOs/               # <Entity>Dto.cs — 1 file/entity chứa mọi DTO của entity đó
│       ├── Entities/           # <Entity>.cs — 1 file/entity chứa entity + hằng số giá trị hợp lệ của nó
│       ├── Repositories/       # <Entity>Repository.cs
│       │   └── Interfaces/     # I<Entity>Repository.cs
│       ├── Services/           # <Entity>Service.cs
│       │   └── Interfaces/     # I<Entity>Service.cs
│       ├── Validators/
│       └── <ModuleName>Module.cs   # Add<ModuleName>Module(): đăng ký DI của module
├── Shared/               # Entities/ (BaseEntity), Exceptions/, Models/ (ApiResponse, PagedRequest, PagedResult), Services/ (CurrentUserService)
├── Data/                 # AppDbContext, IUnitOfWork/UnitOfWork, Configurations/ (Fluent API), Migrations/
└── Tests/                # Project test riêng (chưa tạo), không biên dịch chung
```

- Tên module (thư mục + namespace) dùng **số nhiều** (`Modules/Employees`) để không trùng tên class entity (`Employee`), tránh lỗi C# hiểu nhầm namespace. Module mẫu tham khảo: `Employees`.
- Namespace theo thư mục: `Server.Modules.<ModuleName>.<Folder>`, `Server.Shared.*`, `Server.Data`.
- Thêm module mới: tạo `Modules/<ModuleName>/...` và `<ModuleName>Module.cs`, rồi gọi `services.Add<ModuleName>Module()` trong `Api/Extensions/ServiceCollectionExtensions.AddModules()`.
- Module không gọi thẳng Repository của module khác; nếu cần dữ liệu thì gọi qua Service.

## Đặt tên

- File trùng tên class. **Ngoại lệ:** `DTOs/<Entity>Dto.cs` gom mọi DTO của entity (thứ tự: Response `<Entity>Dto` → `<Entity>RequestBase` → `Create/Update<Entity>Request` → `<Entity>FilterRequest`); `Entities/<Entity>.cs` gom entity và các static class hằng số giá trị (Status, loại…). Mỗi entity một file, không gom nhiều entity vào một file.
- Namespace theo thư mục, kể cả `...Services.Interfaces`, `...Repositories.Interfaces`.
- Class, method, property dùng PascalCase; biến và tham số dùng camelCase; field private dùng `_camelCase`.
- Method bất đồng bộ có hậu tố `Async`. Interface có tiền tố `I`.
- Đặt tên theo entity (một module có thể chứa nhiều entity): Controller `<Entity>sController`, Service `I<Entity>Service` / `<Entity>Service`, Repository `I<Entity>Repository` / `<Entity>Repository`.
- DTO: `<Entity>Dto`, `Create<Entity>Request`, `Update<Entity>Request`, `<Entity>FilterRequest` (kế thừa `PagedRequest`).

## Cơ sở dữ liệu

- Bảng: PascalCase, **số ít** (đồng bộ với DB có sẵn: `Employee`, `OrgUnit`, `User`, `Role`…), luôn khai báo schema `dbo`. Cột: PascalCase. Khóa chính `Id`, khóa ngoại `<Entity>Id`.
- Bảng `User` trùng từ khóa SQL: viết SQL tay phải dùng `[dbo].[User]`.
- Cột unique trên bảng có xóa mềm dùng index có điều kiện `.HasFilter("[IsDeleted] = 0")`. Bảng nối tới entity có xóa mềm phải khai báo query filter tương ứng (vd `UserRole`: `!x.User.IsDeleted && !x.Role.IsDeleted`).
- Mọi bảng nghiệp vụ kế thừa `BaseEntity` gồm: `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `IsDeleted`. `AppDbContext` tự điền audit và tự đổi Remove thành xóa mềm.
- Xóa mềm bằng Global Query Filter (tự áp cho mọi entity kế thừa `BaseEntity`). Chuỗi dùng `nvarchar` có `MaxLength`; số lượng và tiền dùng `decimal` (mặc định precision 18,4).
- Cấu hình bảng bằng Fluent API trong `Data/Configurations/<Entity>Configuration.cs`, không dùng Data Annotation. Repository dùng `dbContext.Set<T>()`, không cần thêm DbSet vào AppDbContext.
- **Bảng có sẵn trong DB** (database `NM_CD2`, không do EF tạo, ví dụ `dbo.Employee`): giữ nguyên tên bảng và cột, cấu hình `ToTable("<Tên>", "dbo", t => t.ExcludeFromMigrations())`. Bảng nào thiếu cột audit thì entity không kế thừa `BaseEntity` và xóa là xóa cứng.
- Migration (chạy tại thư mục `server/`):
  `dotnet ef migrations add <Name> -o Data/Migrations`
  `dotnet ef database update`

## Quy tắc code

- Controller mỏng: chỉ gọi Service và trả `ApiResponse<T>`. Logic nghiệp vụ nằm ở Service, truy vấn nằm ở Repository.
- Không trả Entity ra API, luôn map sang DTO.
- Repository không gọi SaveChanges; Service gọi `IUnitOfWork.SaveChangesAsync`.
- Dùng async/await kèm `CancellationToken`. Query chỉ đọc dùng `AsNoTracking()`.
- Ghi nhiều bảng thì bọc trong `IUnitOfWork.ExecuteInTransactionAsync`.
- Lỗi xử lý tập trung tại middleware; Service ném exception trong `Shared/Exceptions` (`NotFoundException` → 404, `ForbiddenException` → 403, `UnauthorizedException` → 401, còn lại → 400).
- Validate request trong `Modules/<M>/Validators` (static class, thông báo tiếng Việt, key lỗi camelCase), ném `ValidationException`.
- API công khai: gắn `[AllowAnonymous]` trên từng action GET; còn lại mặc định bắt buộc đăng nhập.

## Phân quyền (module Identity)

- RBAC: User (gắn 1 Employee, đăng nhập bằng EmpCode) → nhiều Role → nhiều Permission. Trang (Page) hiển thị khi user có permission xem của trang. Role `SUPER_ADMIN` có toàn quyền.
- Mã quyền dạng `<module>.<hành động>` khai báo trong `Shared/Constants/PermissionCodes.cs`.
- **Permission do code định nghĩa** (vì API phải kiểm tra đúng mã đó): thêm chức năng cần quyền mới → thêm mã vào `PermissionCodes` và `IdentitySeedData.Permissions`; khi khởi động `IdentitySeeder` chỉ **thêm mã mới**, không ghi đè, không xóa. Admin trên FE chỉ xem, sửa tên hiển thị và gán quyền cho role.
- **Page quản lý từ FE** (CRUD qua API): `IdentitySeedData.Pages` chỉ là bộ trang mặc định, seed **một lần khi bảng Page trống**. `Path` phải khớp route có thật ở Client.
- Admin tổng đầu tiên lấy từ User Secrets `Identity:SuperAdmin:EmpCode` / `Identity:SuperAdmin:InitialPassword`, chỉ tạo khi chưa có SUPER_ADMIN nào.
- **Gắn quyền cho API**: `[HasPermission(PermissionCodes.X.Y)]` trên action (hoặc controller). Truyền nhiều mã = chỉ cần có 1 trong số đó. Không gắn gì = chỉ cần đăng nhập; `[AllowAnonymous]` = công khai.
- Trong service, lấy người đang gọi qua `ICurrentUserService` (`UserId`, `UserName` = EmpCode); kiểm tra quyền/leo thang qua `IPermissionService` (`EnsureCanGrantPermissionsAsync`, `EnsureCanAssignRolesAsync`).
- Token: access token 15 phút trong JSON (claims `sub`, `emp_code`, `full_name`, `stamp`, **không chứa quyền**); refresh token 7 ngày trong cookie HttpOnly `refresh_token` (Path `/api/auth`), DB chỉ lưu SHA-256, xoay vòng mỗi lần refresh, dùng lại token cũ → thu hồi mọi phiên.
- Quyền và trạng thái user được cache (`IMemoryCache`, 10 phút). Đổi role/quyền/khóa/mật khẩu phải gọi `IPermissionService.InvalidateUser` hoặc `InvalidateAll` để có hiệu lực ngay; đổi mật khẩu/ngừng tài khoản gọi `user.RenewSecurityStamp()` để vô hiệu access token cũ.
- Chống leo thang: không tự sửa role/trạng thái của mình; phải còn ≥ 1 SUPER_ADMIN hoạt động; người không phải SUPER_ADMIN không đụng tới role/tài khoản SUPER_ADMIN và chỉ cấp được quyền mình đang có.
- Viết SQL tay bằng `sqlcmd` phải thêm cờ `-I` (bật QUOTED_IDENTIFIER) vì bảng có filtered index.

## Cơ cấu tổ chức (module Organization)

- Bảng có sẵn (ExcludeFromMigrations): `OrgUnit`, `OrgUnitType`, `OrgUnitTypeParent`, `PositionLevel`, `Discipline`, `EmployeeAssignment`. View chỉ đọc (`ToView` + `HasNoKey`): `vOrgUnit` (cấp trưởng/phó thực tế), `vUnitMember` (UnitRole HEAD/DEPUTY/MEMBER), `vAssignmentHistory`. DB không có FK giữa các bảng này.
- Trưởng của đơn vị = `OrgUnit.HeadLevelCode ?? OrgUnitType.HeadLevelCode`; `OrgUnitType.SingleHead = false` cho phép nhiều trưởng (Nhóm theo ca). Cha hợp lệ theo `OrgUnitTypeParent`. Tổ (GROUP) không là node riêng trên sơ đồ mà gộp vào khối "Tổ trưởng" của đơn vị cha.
- Đổi chức vụ (`AssignmentService.ChangeAsync`, thay cho `usp_ChangeAssignment` cũ): kết thúc mọi vị trí chính đang giữ vào ngày trước ngày hiệu lực rồi tạo vị trí chính mới; chặn trưởng chính thức thứ 2 ở đơn vị SingleHead, chặn Kỹ sư thứ 2 ở Tổ, ngày hiệu lực phải sau ngày bắt đầu vị trí hiện tại.
- Nhân viên chuyển INACTIVE → `IAssignmentService.EndAllActiveAsync` kết thúc mọi vị trí (Employees gọi qua Service, lưu chung 1 lần SaveChanges).
- Xóa đơn vị = `IsActive = false`; chặn khi còn đơn vị con hoặc còn người giữ vị trí. GD luôn hàng 1, PGD luôn hàng 2 trên sơ đồ.
- Secret lấy từ User Secrets hoặc biến môi trường. Connection string và `Jwt:SecretKey` đang nằm trong User Secrets, không ghi vào appsettings.
