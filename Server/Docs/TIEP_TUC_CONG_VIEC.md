# BÀN GIAO – TIẾP TỤC MODULE BÁO CÁO CÔNG VIỆC TUẦN (WorkReports)

> **Claude ở phiên mới: đọc file này ĐẦU TIÊN**, sau đó đọc theo thứ tự:
> 1. `Docs/HUONG_DAN_BAO_CAO_TUAN.md` — nghiệp vụ đã chốt, thiết kế, trạng thái, nhật ký (nguồn sự thật).
> 2. `CLAUDE.md` — quy ước code chung của Server (kiến trúc module, đặt tên, DTO, lỗi, quyền).
> 3. `Docs/HUONG_DAN_TEST_BAO_CAO_TUAN.md` — luồng hoạt động, vai trò từng API, test từng bước GĐ 1 → GĐ 2 trên Swagger (bản đầy đủ; `TEST_GD1`, `TEST_GD2` là bản theo giai đoạn).
>
> File này ghi **bối cảnh làm việc, cách người dùng muốn làm, bài học đã gặp và kế hoạch bước tiếp theo**.
> Cập nhật mục 2 (trạng thái) và mục 7 (việc tiếp theo) mỗi khi xong một phần.

---

## 1. Dự án trong 1 phút

- Hệ thống quản lý nội bộ Nhà máy Cơ điện 2 (NM.CODIEN2). Server: **.NET 8 + EF Core 8 + SQL Server**, modular monolith (`Modules/<Tên>/{Controllers,Services,Repositories,Entities,DTOs,Validators}`), JWT + phân quyền theo mã quyền + Page/Area. Client (Vite) làm sau.
- Module đang làm: **WorkReports** — thay 2 file Excel hằng tuần của mỗi xưởng (**kế hoạch tuần tới** và **báo cáo tuần đã làm**) bằng form nhập kiểu Google Sheet trên web; mỗi tổ/kíp một form; kỹ sư phụ trách nhập; đội trưởng/quản đốc xem–sửa–yêu cầu sửa–mở khóa; Ban Giám đốc xem trên màn hình chính.
- Lộ trình 5 giai đoạn (chi tiết mục 10 của HUONG_DAN):
  1. Nền tảng (cấu hình, đơn vị báo cáo, kỹ sư phụ trách, kỳ tuần, phạm vi quyền)
  2. Form nhập (lưới, mã CV, người thực hiện, vật tư, dán Excel, tổng hợp, xuất Excel)
  3. Quy trình (cảnh báo, ghi khóa, mở khóa, yêu cầu sửa, lịch sử)
  4. Cộng tác thời gian thực (SignalR)
  5. Màn hình xưởng & nhà máy, dashboard
  + FE làm sau cùng.

---

## 2. Trạng thái hiện tại (cập nhật 15/11/2026)

| Hạng mục | Trạng thái |
|---|---|
| Phân tích nghiệp vụ + thiết kế GĐ 1–2 | ✅ Đã chốt với người dùng (8 câu hỏi GĐ 2 chốt theo đề xuất, HUONG_DAN 13.4) |
| GĐ 1 – Nền tảng (BE) | 🔵 Code xong, đã rà soát & sửa 15/11 (HUONG_DAN 12.5). **Chờ người dùng xác nhận.** |
| GĐ 2 – Form nhập (BE) | 🔵 Code xong **trừ xuất Excel**; migration `AddWorkReportsForms` + `AddWorkReportUnitCustom` (đơn vị tự đặt, 15/11) **đã có trong repo và đã update DB máy công ty**; test tích hợp (rollback) đạt. Chờ người dùng test theo `TEST_GD2` và xác nhận |
| GĐ 2 – Xuất Excel | ⬜ Làm bước cuối của GĐ 2, chờ file mẫu chính thức |
| FE GĐ 1–2 | 🔵 Code xong (Client `modules/workReports`, 4 trang: member kỹ sư, admin Quản lý báo cáo tuần, admin cấu hình, public BGĐ (không cần quyền, không cần đăng nhập); tsc + oxlint + build sạch), chưa chạy thử trên trình duyệt với dữ liệu thật. Phân quyền theo role: 3 mã `work-reports.submit/manage/configure` (HUONG_DAN mục 5). Bật: chạy Server bản mới 1 lần → `Data/Scripts/AddWorkReportPages.sql` → gán quyền cho role `KY_SU`, `QUAN_DOC` (+ role quản trị). HUONG_DAN mục 15 |
| GĐ 3, 4, 5 | ⬜ Chưa làm |

**Lưu ý repo:** `Docs/TEST_GD1_BAO_CAO_TUAN.md` được tạo ở máy khác và **chưa có trong repo** — nhớ commit từ máy đó. `Docs/` đã được tạo lại ở phiên 15/11 (HUONG_DAN, TIEP_TUC, TEST_GD2).

**Máy mới sau khi pull:**
- **Không** chạy `migrations add` cho `AddWorkReportsFoundation` / `AddWorkReportsForms` (đã có).
- Kiểm tra connection string (User Secrets / `appsettings.Development.json`).
- `dotnet ef migrations list` → `dotnet ef database update` → `dotnet run`.

---

## 3. Cách người dùng muốn làm việc (BẮT BUỘC theo)

- **Trả lời bằng tiếng Việt.** Ngắn gọn, rõ ràng, có bảng/checklist khi nhiều bước.
- **Phân tích → đề xuất → người dùng chốt → mới code.** Khi người dùng nói "chưa code", "phân tích", "đưa phương án" thì **không viết code**. Chỉ code khi được bảo "bắt đầu", "thực hiện", "làm theo đề xuất".
- Có quyết định nghiệp vụ chưa rõ → **hỏi** (đưa phương án + đề xuất mặc định). Điểm kỹ thuật nhỏ thì tự quyết và ghi vào HUONG_DAN mục "Quyết định khi code".
- **Không sửa file người dùng gửi** (Excel mẫu, tài liệu) trừ khi được yêu cầu.
- **Mỗi giai đoạn:** code xong → 🔵 "xong, chờ xác nhận" → viết `Docs/TEST_GDx_BAO_CAO_TUAN.md` → người dùng test, báo lỗi → sửa → người dùng **xác nhận** → mới ✅.
- **Luôn cập nhật tài liệu** sau mỗi thay đổi: `HUONG_DAN_BAO_CAO_TUAN.md` (mục 0, mục triển khai GĐ, nhật ký), mục WorkReports trong `CLAUDE.md`, và file này (mục 2, 7).
- **Khi làm qua chat không ghi thẳng vào repo:** gửi **từng file** (không zip), nhóm ≤ 10 file/lần, ghi đường dẫn đích, thứ tự đặt file + mốc `dotnet build`, bảng đếm file theo thư mục. Sửa file có sẵn thì đưa **toàn bộ nội dung**.
- **Khi chạy Claude Code trên máy có repo:** sửa trực tiếp, build sau mỗi nhóm thay đổi, tự tạo migration và đọc lại migration. **Không commit/push** nếu người dùng chưa bảo.
- FE (Client) **chưa làm** cho tới khi người dùng yêu cầu.

---

## 4. Bài học đã gặp (tránh lặp lại)

| Lỗi đã gặp | Cách tránh |
|---|---|
| Tạo `UnitMemberDto` trùng tên lớp có sẵn → 9 lỗi build | **Trước khi tạo lớp mới, grep tên trên toàn project.** |
| `SeederExtensions.cs` chép nửa vời → bảng đầu mục rỗng | Sửa file có sẵn thì đưa toàn bộ file; TEST có bước SQL `COUNT(*)`. |
| Gửi ~30 file/lần qua chat → người dùng không thấy đủ | Gửi nhóm nhỏ + bảng đếm file. |
| `dotnet ef migrations add` báo trùng tên trên máy khác | Migration đã nằm trong repo; máy mới chỉ `database update`. |
| `deadlineTime` gửi `"11:00"` có thể lỗi parse | Gửi `"HH:mm:ss"`. |
| Cảnh báo EF tools 8.0.0 < runtime 8.0.16 | Vô hại; `dotnet tool update --global dotnet-ef --version 8.0.16`. |
| **Server đang chạy khóa `bin/Debug/.../Server.exe`** → `dotnet build` / `dotnet ef` lỗi MSB3021 | Build kiểm tra ra thư mục khác: `dotnet build -p:OutDir=<thư mục tạm>/`; EF: thêm `--configuration Release` (`dotnet ef migrations add … --configuration Release`, `dotnet ef database update --configuration Release`). |
| Thư mục `Docs/` không được commit cùng code | Commit `Docs/` cùng lúc với code của giai đoạn. |
| Kiểm tra hạn ngay sau khi bỏ hạn riêng: bản ghi đã `Remove` nhưng `IsDeleted` chỉ bật lúc SaveChanges | Tự tính giá trị hiệu lực trong service, đừng đọc lại navigation trước khi lưu. |

Quy ước thời gian: `BaseEntity.CreatedAt/UpdatedAt` là **UTC**; mốc nghiệp vụ (hạn nộp, ngày làm việc, mở báo cáo 00:00 T2) dùng **`DateTime.Now` giờ Việt Nam**.

Cách test tích hợp không để lại dữ liệu (đã dùng 15/11): console app tham chiếu `Server.csproj`, dựng DI bằng `AddData` + `AddModules`, thay `ICurrentUserService` / `IWorkReportScopeService` bằng bản giả, chạy mọi thao tác trong `BeginTransaction` rồi **Rollback**.

---

## 5. Bản đồ code module WorkReports

```
Modules/WorkReports/
  WorkReportsModule.cs                 đăng ký DI + hosted service
  Entities/   GĐ1: WorkCategory(+Workshop), MaterialPurpose, WorkReportSetting(+Defaults), WorkReportUnit(+LaborTypes),
                   WorkReportUnitEngineer, WorkWeek, WorkWeekDeadlineOverride
              GĐ2: WeeklyForm(+WorkReportPhases, FormPhaseStatuses), WorkItem(+WorkPermitValues), WorkItemWorker,
                   WorkMaterial, WorkItemCodeCounter
  DTOs/       GĐ1: WorkCategoryDto, MaterialPurposeDto, WorkReportSettingDto, WorkReportUnitDto, WorkReportUnitEngineerDto,
                   WorkWeekDto, WorkReportScopeDto(+WorkReportRoles)
              GĐ2: WeeklyFormDto (lưới, tổng hợp), WorkItemDto (dòng, dán Excel, gợi ý người), WorkMaterialDto
  Validators/ 5 validator GĐ1 + WorkItemRequestValidator (Collect dùng lại cho dán Excel), WorkMaterialRequestValidator
  Repositories/ GĐ1 5 repo; GĐ2: WeeklyFormRepository, WorkItemRepository (NextCodeSeqAsync UPDLOCK,
                PrepareConcurrentUpdate), WorkMaterialRepository
  Services/
    OrgTree / OrgTreeProvider          cây đơn vị (qua IOrgUnitService), cache theo request
    WorkReportScope / ScopeService     phạm vi người gọi → GetUnitAccessAsync(unit[, workshopId của form])
    WorkWeekCalculator / WorkWeekService  tuần ISO, hạn, GetEffectiveDeadlines (static)
    WorkWeekGeneratorService           nền 15s rồi 6h/lần: EnsureWeeks + WeeklyFormService.SyncFormsAsync(null)
    WeeklyFormService                  SyncFormsAsync (tạo form / cập nhật ảnh chụp / bỏ form trống), GetContextAsync
                                       (quyền + trạng thái, forEdit ném 403/400), GetVisibleFormsAsync, GetGrid, GetSummary
    WeeklyFormRules / WeeklyFormContext  mở/khóa theo giai đoạn, CanEditNow, mã CV, La Mã, tiêu đề
    WorkItemService                    thêm/sửa (rowVersion → 409)/xóa dòng, dán Excel, worker-options
    WorkMaterialService                vật tư theo form / xưởng
    WorkItemMapper, WorkItemInputParser, TextNormalizer
    + WorkCategory/MaterialPurpose/WorkReportSetting/WorkReportUnit/WorkReportUnitEngineer Service (GĐ1)
  Controllers/ work-categories, material-purposes, work-report-settings, work-report-units, work-weeks, work-reports
Data/Configurations/  13 file cấu hình bảng WorkReports
Data/Seeders/WorkReportSeeder.cs
Shared/Exceptions/AppException.cs     ConflictException → 409 (ExceptionHandlingMiddleware trả data)
```
Hàm đọc ở module khác (chỉ đọc): `IAssignmentService.GetCurrentAssignmentsAsync`, `GetUnitMembersAsync`; `IEmployeeService.GetBriefsAsync`, `GetCurrentEmployeeIdAsync`; `IEquipmentService.GetByCodeAsync`, `GetByCodesAsync`.

DI không vòng: `WeeklyFormService` **không** phụ thuộc `WorkReportUnitService` / `WorkReportUnitEngineerService` / `WorkReportSettingService` (ba service này gọi `SyncFormsAsync`). Giữ nguyên chiều này khi thêm code.

---

## 6. Nguyên tắc thiết kế cần giữ khi làm tiếp

- Module khác chỉ gọi qua **Service interface**, không gọi Repository/DbSet của module khác.
- **Phạm vi lấy từ sơ đồ tổ chức**, không tạo mã quyền theo từng tổ; mọi API ghi kiểm tra phạm vi + trạng thái khóa ở Service (FE chỉ ẩn/hiện).
- Xưởng của đơn vị **tính từ cây** khi đọc; **form chụp** xưởng/tên/tiền tố/giờ công/KTV — cập nhật khi chưa khóa báo cáo, cố định khi khóa; tiền tố chỉ đổi khi form chưa cấp mã.
- Một việc kế hoạch = **một dòng** dùng chung cho kế hoạch và báo cáo; báo cáo thêm dòng phát sinh.
- Hạn: báo cáo tuần N và kế hoạch tuần N+1 **khóa cùng lúc**; "đang khóa" **tính khi đọc/ghi** (`WeeklyFormRules`), không phụ thuộc tác vụ nền. Báo cáo mở từ 00:00 T2 của tuần.
- Trường không thuộc giai đoạn bị bỏ qua (không báo lỗi).

---

## 7. VIỆC TIẾP THEO

### 7.1 Ngay bây giờ
1. Người dùng test GĐ 1 (`TEST_GD1`) + GĐ 2 (`TEST_GD2`), báo lỗi → sửa → xác nhận → đánh ✅ trong HUONG_DAN mục 0 và file này.
2. Commit `Docs/` (kể cả `TEST_GD1` từ máy khác).

### 7.2 Bước cuối GĐ 2 – Xuất Excel
- `GET /api/work-reports/export?workshopId=&weekId=&phase=` (ClosedXML 0.101 có sẵn; tham khảo `IssuedDocumentService`, `IncidentService`).
- Dạng đã chốt: **mỗi tổ/kíp 1 sheet** (18 cột báo cáo / 12 cột kế hoạch, nhóm đầu mục A–I, TT, tiêu đề như mục 3.3) + sheet **Tổng hợp** + sheet **Vật tư**.
- Dùng lại `WeeklyFormService.GetGridAsync` / `GetSummaryAsync` / `WorkMaterialService.GetWorkshopMaterialsAsync` để số liệu khớp màn hình.
- **Cần file mẫu chính thức** từ người dùng trước khi code (định dạng, độ rộng cột, logo/tiêu đề).

### 7.3 GĐ 3 – Quy trình
- `RevisionRequest`, `WorkItemHistory` (ghi trong `WorkItemService` khi sửa), mở khóa (đặt `PlanUnlockedUntil` / `ReportUnlockedUntil` — `WeeklyFormRules` đã tính sẵn), tác vụ nền ghi `PlanLockedAt` / `ReportLockedAt`, cảnh báo web T7/CN (kiểm tra hệ thống đã có module thông báo chưa), đếm "kỹ sư chưa phân công".
- Câu hỏi cần hỏi trước: mở khóa bao lâu (mặc định?), yêu cầu sửa theo dòng hay theo ô, có cần nút "Nộp" không.

### 7.4 Sau đó
- GĐ 4: SignalR hub theo form, presence theo dòng (409 + rowVersion đã có làm nền).
- GĐ 5: trang nhà máy + dashboard từng xưởng (không so sánh xưởng, không xu hướng nhiều tuần), lưới chỉ đọc.
- FE: cần source Client để chọn thư viện lưới (chú ý giấy phép thương mại).
