# CLAUDE.md — Server (.NET 8 Web API + SQL Server)

Đọc kèm `../CLAUDE.md`.

## Cấu trúc (Clean Architecture)

Tầng là project, module là thư mục `Modules/<ModuleName>` bên trong từng tầng.
Tên module (thư mục + namespace) dùng **số nhiều** (`Modules/Employees`) để không trùng tên class entity (`Employee`), tránh lỗi C# hiểu nhầm namespace. Module mẫu tham khảo: `Employees`.

```
server/
├── Server.sln
├── Directory.Build.props          # net8.0, Nullable, ImplicitUsings dùng chung
├── src/
│   ├── Domain/                    # Không phụ thuộc gì
│   │   ├── Common/                # BaseEntity
│   │   ├── Exceptions/            # DomainException
│   │   └── Modules/<ModuleName>/  # Entities/, Enums/
│   ├── Application/               # → Domain
│   │   ├── Common/                # Exceptions/, Interfaces/ (IUnitOfWork, ICurrentUserService), Models/ (PagedResult, PagedRequest)
│   │   ├── DependencyInjection.cs # AddApplication(): Scrutor quét class đuôi "Service"
│   │   └── Modules/<ModuleName>/  # DTOs/, Interfaces/ (I<Module>Repository, I<Module>Service), Services/, Validators/
│   ├── Infrastructure/            # → Application
│   │   ├── Persistence/           # AppDbContext, UnitOfWork, Migrations/
│   │   ├── DependencyInjection.cs # AddInfrastructure(): DbContext, UnitOfWork, Scrutor quét class đuôi "Repository"
│   │   └── Modules/<ModuleName>/  # Configurations/ (Fluent API), Repositories/
│   └── Api/                       # → Application, Infrastructure (host)
│       ├── Gateway/               # Điểm vào duy nhất: JWT, CORS, rate limit, fallback policy bắt buộc đăng nhập
│       ├── Middlewares/           # ExceptionHandlingMiddleware
│       ├── Common/                # ApiResponse
│       ├── Services/              # CurrentUserService
│       ├── Modules/<ModuleName>/  # Controllers/
│       └── Program.cs, appsettings*.json
└── tests/
```

- Chiều phụ thuộc: `Api → Infrastructure → Application → Domain`. Không tham chiếu ngược.
- Application chỉ khai báo interface, không dùng EF Core; Infrastructure cài đặt.
- DI tự động bằng Scrutor theo hậu tố tên class (`...Service` ở Application, `...Repository` ở Infrastructure), không cần đăng ký tay từng module.
- Module không gọi thẳng Repository của module khác; nếu cần dữ liệu thì gọi qua Service.
- Thư viện theo tầng: Application (Scrutor); Infrastructure (EF Core, SqlServer, ClosedXML, Scrutor); Api (JwtBearer, OpenApi, Swashbuckle, EF Design/Tools).

## Đặt tên

- File trùng tên class. Class, method, property dùng PascalCase; biến và tham số dùng camelCase; field private dùng `_camelCase`.
- Method bất đồng bộ có hậu tố `Async`. Interface có tiền tố `I`.
- Controller: `<Module>sController`. Service: `I<Module>Service` / `<Module>Service`. Repository: `I<Module>Repository` / `<Module>Repository`.
- DTO: `<Entity>Dto`, `Create<Entity>Request`, `Update<Entity>Request`, `<Entity>FilterRequest` (kế thừa `PagedRequest`).

## Cơ sở dữ liệu

- Bảng: PascalCase, số nhiều. Cột: PascalCase. Khóa chính `Id`, khóa ngoại `<Entity>Id`.
- Mọi bảng nghiệp vụ kế thừa `BaseEntity` gồm: `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `IsDeleted`. `AppDbContext` tự điền audit và tự đổi Remove thành xóa mềm.
- Xóa mềm bằng Global Query Filter (tự áp cho mọi entity kế thừa `BaseEntity`). Chuỗi dùng `nvarchar` có `MaxLength`; số lượng và tiền dùng `decimal` (mặc định precision 18,4).
- Cấu hình bảng bằng Fluent API trong `Infrastructure/Modules/<ModuleName>/Configurations`, không dùng Data Annotation. Repository dùng `dbContext.Set<T>()`, không cần thêm DbSet vào AppDbContext.
- **Bảng có sẵn trong DB** (database `NM_CD2`, không do EF tạo, ví dụ `dbo.Employee`): giữ nguyên tên bảng và cột, cấu hình `ToTable("<Tên>", "dbo", t => t.ExcludeFromMigrations())`. Bảng nào thiếu cột audit thì entity không kế thừa `BaseEntity` và xóa là xóa cứng.
- Migration (chạy tại thư mục `server/`):
  `dotnet ef migrations add <Name> -p src/Infrastructure -s src/Api -o Persistence/Migrations`
  `dotnet ef database update -p src/Infrastructure -s src/Api`

## Quy tắc code

- Controller mỏng: chỉ gọi Service và trả `ApiResponse<T>`. Logic nghiệp vụ nằm ở Service, truy vấn nằm ở Repository.
- Không trả Entity ra API, luôn map sang DTO.
- Repository không gọi SaveChanges; Service gọi `IUnitOfWork.SaveChangesAsync`.
- Dùng async/await kèm `CancellationToken`. Query chỉ đọc dùng `AsNoTracking()`.
- Ghi nhiều bảng thì bọc trong `IUnitOfWork.ExecuteInTransactionAsync`.
- Lỗi xử lý tập trung tại middleware; Service ném exception trong `Application/Common/Exceptions` (`NotFoundException` → 404, `ForbiddenException` → 403, `UnauthorizedException` → 401, còn lại → 400).
- Secret lấy từ User Secrets (project Api) hoặc biến môi trường. Connection string và `Jwt:SecretKey` đang nằm trong User Secrets, không ghi vào appsettings.
- Validate request trong `Application/Modules/<M>/Validators` (static class, thông báo tiếng Việt, key lỗi camelCase), ném `ValidationException`.
