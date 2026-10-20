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

- Bảng: PascalCase, số nhiều. Cột: PascalCase. Khóa chính `Id`, khóa ngoại `<Entity>Id`.
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
- Secret lấy từ User Secrets hoặc biến môi trường. Connection string và `Jwt:SecretKey` đang nằm trong User Secrets, không ghi vào appsettings.
