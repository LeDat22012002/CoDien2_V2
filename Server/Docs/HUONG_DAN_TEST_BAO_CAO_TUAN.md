# HƯỚNG DẪN TEST TỪNG BƯỚC — BÁO CÁO CÔNG VIỆC TUẦN (GĐ 1 → GĐ 2)

> Dùng để test backend module `WorkReports` trên **Swagger**, đi theo đúng luồng làm việc thật: cấu hình → đơn vị → kỹ sư → tuần → lập kế hoạch → báo cáo → tổng hợp.
> Phần A giải thích **luồng hoạt động** và **vai trò từng API**. Phần B là **các bước test**: mỗi bước có body mẫu, kết quả đúng và trường hợp lỗi.
> Đánh ✅ / ❌ vào cột cuối của từng bước; lỗi gặp ghi vào bảng ở cuối file.
> Nghiệp vụ chi tiết: `Docs/HUONG_DAN_BAO_CAO_TUAN.md`. File này thay cho `TEST_GD1` + `TEST_GD2` khi test trọn luồng.

---

# PHẦN A — LUỒNG HOẠT ĐỘNG & VAI TRÒ CÁC API

## A1. Luồng tổng thể

```
 ┌──────────────── CẤU HÌNH (1 lần, admin) ────────────────┐
 │ Cấu hình chung → Đầu mục A–I → Mục đích vật tư → Hạn nộp │
 └───────────────────────────┬─────────────────────────────┘
                             ▼
 ┌──────── ĐƠN VỊ BÁO CÁO (quản đốc / admin, khi có tổ mới) ─┐
 │ Tổ/kíp trên sơ đồ tự thành đơn vị → xóa / sửa / thêm tự đặt│
 │ → Sắp thứ tự I, II… → Phân công kỹ sư phụ trách            │
 └───────────────────────────┬────────────────────────────────┘
                             ▼  (hệ thống tự tạo form tuần cho mỗi đơn vị)
 ┌──────────────── HẰNG TUẦN (kỹ sư, đội trưởng, quản đốc) ─────────────────┐
 │ Tuần N−1: LẬP KẾ HOẠCH tuần N (phase=PLAN)                                │
 │   thêm dòng / dán Excel / gắn vật tư dự kiến                              │
 │   ── T2 tuần N, 11:00: kế hoạch tuần N KHÓA ──                            │
 │ Tuần N: BÁO CÁO (phase=REPORT, mở từ 00:00 T2 tuần N)                     │
 │   điền thực tế vào dòng kế hoạch, thêm dòng phát sinh, vật tư thực tế     │
 │   ── T2 tuần N+1, 11:00: báo cáo tuần N KHÓA ──                           │
 │ Quản đốc/phó vẫn sửa được khi đã khóa                                     │
 └───────────────────────────┬──────────────────────────────────────────────┘
                             ▼
 ┌──────────── XEM (quản đốc, Ban Giám đốc) ────────────┐
 │ Bảng công việc · Tổng hợp · Vật tư xưởng             │
 └───────────────────────────────────────────────────────┘
```

Một tuần có **một form cho mỗi tổ/kíp**. Form có 2 giai đoạn dùng chung các dòng:
- **PLAN (kế hoạch)**: mở từ khi form được tạo tới hạn kế hoạch (mặc định T2 của chính tuần, 11:00).
- **REPORT (báo cáo)**: mở từ 00:00 T2 của tuần tới hạn báo cáo (mặc định T2 tuần sau, 11:00).

Sáng T2 trước 11:00, kế hoạch tuần này và báo cáo tuần trước cùng mở.

## A2. Ai làm được gì (mã quyền theo role quyết định vai trò, sơ đồ tổ chức quyết định phạm vi)

| Vai trò | Xác định bằng | Trang | Xem | Nhập khi mở | Sửa khi khóa | Cấu hình đơn vị | Phân công kỹ sư |
|---|---|---|---|---|---|---|---|
| Admin | quyền `work-reports.configure` | `/admin/work-report-settings` | mọi xưởng | ✖ | ✖ | ✔ mọi xưởng | ✔ |
| Quản đốc / phó | quyền `work-reports.manage` + trưởng/phó đơn vị cấp 1 (xưởng) trên sơ đồ | `/admin/work-reports` | cả xưởng | ✔ | ✔ | ✔ xưởng mình | ✔ tổ + kíp |
| Đội trưởng / phó | quyền `work-reports.manage` + trưởng/phó Đội (`TEAM`) | `/admin/work-reports` | các tổ trong đội | ✔ | ✖ | ✖ | ✔ tổ (không kíp) |
| Kỹ sư phụ trách | quyền `work-reports.submit` + có tên trong danh sách kỹ sư của tổ/kíp | `/member/work-reports` | tổ/kíp được giao | ✔ | ✖ | ✖ | ✖ |
| Ban Giám đốc / mọi người | không cần quyền, không cần đăng nhập | `/work-reports` (công khai, API `/api/work-reports/public/*`) | mọi xưởng | ✖ | ✖ | ✖ | ✖ |

Không có quyền nào trong 3 mã `submit` / `manage` / `configure` → mọi API báo cáo tuần (trừ `/api/work-reports/public/*`) trả **403**.

## A3. Vai trò từng API trong luồng

### A3.1 Cấu hình chung (GĐ 1)

| API | Ai dùng | Vai trò trong luồng | FE dùng ở đâu |
|---|---|---|---|
| `GET /api/work-report-settings` | đăng nhập | Đọc hằng số giờ công HC/KIP, hạn mặc định, số ngày cảnh báo | Trang cấu hình; FE hiện mô tả hạn |
| `PUT /api/work-report-settings` | `configure` | Đổi hằng số / hạn mặc định → tính lại hạn **chưa tới** của tuần chưa chỉnh tay; form chưa khóa nhận giờ công mới | Trang cấu hình |
| `GET /api/work-categories?workshopId=&includeInactive=` | đăng nhập | Danh sách đầu mục A–I (lọc theo xưởng áp dụng) → dropdown cột (3) | Lưới, trang quản trị |
| `GET /api/work-categories/{id}` | đăng nhập | Chi tiết 1 đầu mục | Trang quản trị |
| `POST /api/work-categories`, `PUT /{id}` | `configure` | Thêm/sửa đầu mục (giá trị dropdown, nhóm, hậu tố mã, xưởng áp dụng) | Trang quản trị |
| `PATCH /api/work-categories/{id}/active` | `configure` | Ngừng / dùng lại đầu mục (không xóa) | Trang quản trị |
| `GET /api/material-purposes` | đăng nhập | Dropdown "Mục đích" của vật tư | Lưới vật tư |
| `POST /api/material-purposes`, `PUT /{id}`, `PATCH /{id}/active` | `configure` | Quản lý danh mục mục đích vật tư | Trang quản trị |

### A3.2 Kỳ tuần & hạn nộp (GĐ 1)

| API | Ai dùng | Vai trò trong luồng | FE dùng ở đâu |
|---|---|---|---|
| `GET /api/work-weeks/current?workshopId=` | đăng nhập | **Điểm vào hằng ngày**: trả tuần đang nhập báo cáo (`reportWeek`) và tuần đang lập kế hoạch (`planWeek`), theo hạn của xưởng | Mở màn hình lưới → chọn tuần mặc định |
| `GET /api/work-weeks?year=&workshopId=` | đăng nhập | Danh sách tuần trong năm (tự tạo nếu thiếu), kèm hạn hiệu lực | Bộ chọn tuần ◀ ▶, trang quản trị hạn |
| `GET /api/work-weeks/{id}?workshopId=` | đăng nhập | Chi tiết 1 tuần + hạn riêng các xưởng | Trang quản trị hạn |
| `PUT /api/work-weeks/{id}/deadline` | `configure` | Chỉnh hạn chung toàn nhà máy hoặc hạn riêng 1 xưởng (lùi hạn, nghỉ lễ…) | Trang quản trị hạn |

### A3.3 Đơn vị báo cáo & kỹ sư phụ trách (GĐ 1)

| API | Ai dùng | Vai trò trong luồng | FE dùng ở đâu |
|---|---|---|---|
| `GET /api/work-reports/my-scope` | đăng nhập | **Điểm vào của mọi màn hình**: các xưởng / tổ-kíp người dùng xem được, vai trò, quyền từng đơn vị → FE ẩn/hiện menu, nút | Sau đăng nhập, bộ chọn xưởng |
| `GET /api/work-report-units/parent-options?workshopId=` | admin, quản đốc | Xưởng + các đội: chỗ gắn đơn vị tự đặt | Hộp thoại "Thêm đơn vị" |
| `POST /api/work-report-units` | admin, quản đốc | Thêm **đơn vị tự đặt** (không có trên sơ đồ; `parentOrgUnitId` = xưởng/đội, tên bắt buộc) → **tự tạo form** tuần đang chạy + tuần sau. Tổ/kíp trên sơ đồ thì hệ thống tự tạo | Nút "Thêm đơn vị" |
| `DELETE /api/work-report-units/{id}` | admin, quản đốc | Xóa đơn vị **chưa có dữ liệu** (bỏ form trống, phân công kỹ sư); đã có kế hoạch/báo cáo → 400, chỉ ngừng dùng. Tổ/kíp đã xóa không tự tạo lại | Nút xóa |
| `GET /api/work-report-units/deleted?workshopId=`, `POST /{id}/restore` | admin, quản đốc | Danh sách đã xóa / khôi phục (tiền tố trùng thì tự thêm `-2`) | Mục "Đã xóa" |
| `GET /api/work-report-units?workshopId=&includeInactive=` | đăng nhập | Danh sách đơn vị theo thứ tự trong xưởng, kèm kỹ sư và quyền | Trang đơn vị |
| `GET /api/work-report-units/{id}` | đăng nhập | Chi tiết 1 đơn vị | Trang đơn vị |
| `PUT /api/work-report-units/{id}` | admin, quản đốc | Sửa tên, tiền tố, HC/KIP, bật/ngừng → cập nhật form chưa khóa | Trang đơn vị |
| `PUT /api/work-report-units/reorder` | admin, quản đốc | Sắp thứ tự I, II… trong xưởng (thứ tự nhóm trên lưới và Tổng hợp) | Kéo thả trên trang đơn vị |
| `GET /api/work-report-units/{id}/engineer-suggestions` | người được phân công | Kỹ sư (cấp KS) trên sơ đồ ở tổ/kíp và đội → chọn nhanh | Hộp thoại phân công |
| `PUT /api/work-report-units/{id}/engineers` | tổ: quản đốc, đội trưởng; kíp: quản đốc | Lưu cả danh sách kỹ sư phụ trách → họ được nhập form; tên KTV trên form cập nhật | Hộp thoại phân công |
| `GET /api/work-report-units/{id}/engineers` | xem được đơn vị | Kỹ sư đang phụ trách | Trang đơn vị |

### A3.4 Form, lưới, dòng công việc, vật tư (GĐ 2) — prefix `/api/work-reports`

| API | Ai dùng | Vai trò trong luồng | FE dùng ở đâu |
|---|---|---|---|
| `GET grid?workshopId=&weekId=&phase=&unitId=` | xem được xưởng | **Màn hình chính**: các form (I, II…) với trạng thái, hạn, `canEditNow`, tổng phút; dòng theo đầu mục + TT; danh sách đầu mục cho dropdown. Tuần đang làm việc thì tự tạo form còn thiếu | Tab "Bảng công việc" |
| `POST forms/{formId}/items?phase=` | người nhập | Thêm 1 dòng. PLAN = dòng kế hoạch; REPORT = dòng phát sinh. Trả mã CV tự sinh + `rowVersion` | Nút "+ Thêm dòng", lưu tự động dòng mới |
| `PUT items/{id}?phase=` | người nhập | Lưu 1 dòng (gửi `rowVersion`); người khác vừa sửa → **409** kèm dòng mới nhất để FE hiện lại | Lưu tự động khi rời dòng |
| `DELETE items/{id}?phase=` | người nhập | Xóa dòng (kèm vật tư của dòng). Báo cáo không xóa dòng kế hoạch | Menu chuột phải / nút xóa |
| `POST forms/{formId}/items/batch?phase=` | người nhập | **Dán từ Excel**: server chuẩn hóa từng ô, lưu dòng đúng, trả lỗi theo cột cho dòng sai | Ctrl+V vào lưới |
| `GET worker-options?unitId=&scope=&keyword=` | xem được đơn vị | Gợi ý người thực hiện: UNIT (tổ/kíp) → TEAM (đội) → WORKSHOP (xưởng) | Ô cột (9) |
| `GET forms/{formId}/materials?phase=` | xem được form | Vật tư của 1 tổ/kíp | Khung vật tư của form |
| `POST forms/{formId}/materials?phase=` | người nhập | Thêm vật tư gắn 1 dòng công việc | Khung vật tư |
| `PUT materials/{id}?phase=`, `DELETE materials/{id}?phase=` | người nhập | Sửa / xóa vật tư | Khung vật tư |
| `GET summary?workshopId=&weekId=&phase=` | xem được xưởng | **Sheet Tổng hợp**: mỗi tổ 1 dòng — phút theo đầu mục, tổng, nhân lực quy đổi, số đầu mã vật tư, trạng thái | Tab "Tổng hợp" (BGĐ, quản đốc) |
| `GET materials?workshopId=&weekId=&phase=` | xem được xưởng | **Sheet Vật tư** cả xưởng | Tab "Vật tư xưởng" |
| *(chưa có)* `GET export?...` | xem được xưởng | Xuất Excel đúng mẫu | Nút "Xuất Excel" (làm bước cuối) |

Quy ước chung của API GĐ 2:
- Thao tác ghi luôn kèm `?phase=PLAN` hoặc `?phase=REPORT`.
- Trường không thuộc giai đoạn bị **bỏ qua** (không báo lỗi). Ví dụ: gửi `actualMinutes` ở PLAN thì không lưu.
- Mã lỗi: **403** khi không có quyền nhập/xem; **400** khi form chưa tới tuần / đã khóa (thông báo ghi rõ hạn) hoặc dữ liệu sai (`errors` theo trường camelCase); **409** khi xung đột ghi; **404** khi không tìm thấy.

### A3.5 Tác vụ nền (không gọi tay)

`WorkWeekGeneratorService`: chạy 15 giây sau khi Server khởi động, rồi 6 giờ/lần. Việc nó làm:
- Tạo kỳ tuần (tuần trước → 2 tuần tới).
- Tạo form còn thiếu của mọi đơn vị đang dùng.
- Cập nhật tên tổ, KTV, giờ công của form chưa khóa báo cáo.
- Bỏ form **trống** tuần sau của đơn vị đã ngừng.

---

# PHẦN B — CÁC BƯỚC TEST

## B0. Chuẩn bị

### B0.1 Database & Server
| # | Việc | Kết quả đúng | ✔ |
|---|---|---|---|
| 0.1 | `dotnet ef migrations list` | Có `AddWorkReportsFoundation`, `AddWorkReportsForms` (không còn "Pending") | |
| 0.2 | `dotnet ef database update` → chạy Server | Log không lỗi; lần đầu có "Đã tạo 9 đầu mục…", "Đã tạo 8 mục đích vật tư…", "Đã tạo cấu hình…" | |
| 0.3 | SQL kiểm tra (chạy bên dưới) | 13 bảng; 9 đầu mục; 8 mục đích; 1 cấu hình | |

```sql
SELECT name FROM sys.tables WHERE name IN ('WorkCategory','WorkCategoryWorkshop','MaterialPurpose','WorkReportSetting',
  'WorkReportUnit','WorkReportUnitEngineer','WorkWeek','WorkWeekDeadlineOverride',
  'WeeklyForm','WorkItem','WorkItemWorker','WorkMaterial','WorkItemCodeCounter');
SELECT COUNT(*) FROM dbo.WorkCategory;      -- 9
SELECT COUNT(*) FROM dbo.MaterialPurpose;   -- 8
SELECT * FROM dbo.WorkReportSetting;        -- 1 dòng: 2700 / 2467.44 / 7 / 11:00 / 2
```

### B0.2 Tài khoản test
Chọn **một xưởng X** có ít nhất 1 tổ (`GROUP`) và nếu được thì có 1 kíp (`SHIFT`). Tra người trên trang **Sơ đồ tổ chức**.

| Ký hiệu | Là ai | Cần gì |
|---|---|---|
| **AD** | Admin | Role có `work-reports.configure` (SUPER_ADMIN có sẵn) |
| **Q** | Quản đốc / phó xưởng X | Role có `work-reports.manage` (vd `QUAN_DOC`) + trưởng/phó đơn vị cấp 1 X trên sơ đồ |
| **D** | Đội trưởng của đội chứa tổ T (nếu xưởng có Đội) | Role có `work-reports.manage` + trưởng/phó Đội trên sơ đồ |
| **K** | Kỹ sư sẽ được phân công tổ T | Role có `work-reports.submit` (vd `KY_SU`), nhân viên đang làm việc, có tài khoản |
| **G** | Ban Giám đốc | Không cần gì: mở `/work-reports` (cả khi chưa đăng nhập) |
| **B** | Người ngoài | Không có quyền `work-reports.*` |

Gán quyền: chạy Server bản mới 1 lần (seeder thêm 3 quyền) → chạy `Data/Scripts/AddWorkReportPages.sql` → màn hình **Phân quyền** nhóm "Báo cáo tuần": `submit` → Kỹ sư, `manage` → Quản đốc (và role đội trưởng nếu có), `configure` → quản trị.

Kiểm tra nhanh phân quyền: **B** gọi `GET /api/work-reports/my-scope` → 403; **K** mở `/admin/work-reports` → báo không có quyền; chưa đăng nhập mở `/work-reports` → xem được mọi xưởng, không có nút sửa / dán / thêm; Quản đốc **không** có `manage` → `my-scope` không còn `isManager`.

### B0.3 Đăng nhập trên Swagger
1. `POST /api/auth/login` với body `{ "empCode": "<mã NV>", "password": "<mật khẩu>", "isRemembered": false }` → copy `accessToken`.
2. Bấm **Authorize** → nhập `Bearer <accessToken>`. Token sống 15 phút; hết hạn thì đăng nhập lại.
3. Đổi người test = đăng nhập lại bằng tài khoản khác rồi Authorize lại.

### B0.4 Bảng ghi Id (điền dần khi test)
| Tên | Ý nghĩa | Giá trị |
|---|---|---|
| X | Id xưởng | |
| T_ORG | OrgUnit Id của tổ T | |
| K_ORG | OrgUnit Id của kíp (nếu có) | |
| U_T | Id đơn vị báo cáo tổ T | |
| U_K | Id đơn vị báo cáo kíp | |
| W_BC / W_KH | Id tuần đang báo cáo / tuần đang lập kế hoạch | |
| C1, C2, CPU | Id đầu mục BT-LV1, BT-LV2, BT Phản ứng | |
| P_BTBD | Id mục đích BTBD | |
| F_KH / F_BC | Id form tổ T của tuần W_KH / W_BC | |

---

## B1. Phạm vi người dùng — `my-scope`

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 1.1 | AD | `GET /api/work-reports/my-scope` | `canConfigure` = true; `workshops` = mọi xưởng, `isManager` = true. **Ghi X** | |
| 1.2 | Q | như trên | Có xưởng X, `isManager` = true; `canConfigure` = false | |
| 1.3 | G | như trên | `canViewFactory` = true; thấy mọi xưởng; `isManager` = false | |
| 1.4 | B | như trên | `workshops` rỗng | |

## B2. Cấu hình chung (AD)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 2.1 | `GET /api/work-report-settings` | 2700 / 2467.44 / offset 7 / `"11:00:00"` / 2; `deadlineDescription` "… Thứ 2 tuần sau, 11:00" | |
| 2.2 | `PUT` body dưới, rồi đặt lại như cũ | 200; `GET /api/work-weeks/current` → hạn tuần sau đổi theo; hạn đã qua giữ nguyên | |
| 2.3 | `PUT` với `deadlineDayOffset: 20` | 400 lỗi `deadlineDayOffset` | |
| 2.4 | Đăng nhập Q, `PUT` | 403 | |

```json
{ "hcMinutesPerWeek": 2700, "shiftMinutesPerWeek": 2467.44, "deadlineDayOffset": 7, "deadlineTime": "10:00:00", "warnDaysBefore": 2 }
```
> Bước 2.2 nhớ đặt lại `"deadlineTime": "11:00:00"`.

### Đầu mục công việc
| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 2.5 | `GET /api/work-categories` | 9 đầu mục A→I theo thứ tự. **Ghi C1, C2, CPU** | |
| 2.6 | `POST` đầu mục thử (body dưới) | 200, `workshopIds` = [X] | |
| 2.7 | `GET /api/work-categories?workshopId=<xưởng khác X>` | **Không** có đầu mục thử | |
| 2.8 | `POST` trùng `code` "BT-LV1" hoặc trùng `codeSuffix` "LV1" | 400 lỗi `code` / `codeSuffix` | |
| 2.9 | `codeSuffix` = "AB C" | 400 (không cho khoảng trắng, gạch) | |
| 2.10 | `PATCH /{id}/active` `{ "isActive": false }` cho đầu mục thử | Không còn trong danh sách mặc định; có khi `includeInactive=true` | |

```json
{ "code": "Thử nghiệm", "groupLetter": "J", "name": "Đầu mục thử", "codeSuffix": "TN", "showInSummary": true, "workshopIds": [X] }
```

### Mục đích vật tư
| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 2.11 | `GET /api/material-purposes` | 8 mục: BTBD, BTSC, TTTX, THTX, Phục hồi, VTDP, Gói Thầu, CTCT. **Ghi P_BTBD** | |
| 2.12 | `POST { "code": "BTBD" }` | 400 trùng | |

## B3. Kỳ tuần & hạn nộp

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 3.1 | K hoặc bất kỳ | `GET /api/work-weeks/current?workshopId=X` | `reportWeek` = tuần chứa hôm nay (sáng T2 trước 11:00 thì là tuần trước); `planWeek` = tuần kế tiếp. **Ghi W_BC, W_KH** | |
| 3.2 | | `GET /api/work-weeks?year=2026` | Đủ 52/53 tuần; nhãn dạng "Tuần 46 · Tháng 11/2026 · 09/11–15/11"; tuần vắt năm ghi "Tuần 01/2027 · Tháng 12/2026" | |
| 3.3 | AD | `PUT /api/work-weeks/{W_KH}/deadline` hạn riêng xưởng: `{ "workshopId": X, "reportDeadlineAt": "<T3 sau tuần W_KH>T11:00:00" }` | `GET /current?workshopId=X` → `effectiveReportDeadlineAt` đổi; xưởng khác không đổi | |
| 3.4 | AD | Hạn riêng `planDeadlineAt` **sau** `reportDeadlineAt` | 400 lỗi `planDeadlineAt` | |
| 3.5 | AD | Hạn chung chỉ gửi 1 hạn (không có `workshopId`) | 400 lỗi `deadline` | |
| 3.6 | AD | `{ "workshopId": X, "resetToDefault": true }` | Bỏ hạn riêng, xưởng về hạn chung | |
| 3.7 | AD | Hạn chung `{ "resetToDefault": true }` | `isDeadlineCustomized` = false, hạn tính lại theo cấu hình | |
| 3.8 | Q | Gọi `PUT deadline` | 403 | |

## B4. Đơn vị báo cáo

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 4.1 | Q | `GET /api/work-report-units?workshopId=X&includeInactive=true` | **Mọi tổ/kíp đang hoạt động** của X trên sơ đồ đã có trong danh sách (tự tạo), tiền tố không trùng, kíp = KIP. **Ghi U_T (1 tổ), U_K (1 kíp)** | |
| 4.2 | Q | `deleted?workshopId=<Id một Đội/tổ>` | 404 "Không tìm thấy xưởng." | |
| 4.3 | D hoặc K | `DELETE /api/work-report-units/{U_T}` | 403 | |
| 4.4 | Q | `POST /api/work-report-units` (body dưới, `parentOrgUnitId` = 1 đội của X) | 201; `isCustom` = true, `workshopId` = X, `teamName` = đội đã chọn. **Ghi U_C** | |
| 4.5 | | SQL: `SELECT * FROM WeeklyForm WHERE WorkReportUnitId IN (U_T, U_C)` | Có form tuần đang chạy + tuần sau (+ tuần trước nếu báo cáo tuần trước chưa khóa); `CapacityMinutes` 2700, `CodePrefix` đúng | |
| 4.6 | Q | `DELETE /{U_C}` (chưa nhập gì) → `GET deleted?workshopId=X` → `POST /{U_C}/restore` | Xóa OK, form trống bị bỏ; có trong Đã xóa; khôi phục lại có form | |
| 4.7 | Q | Xóa 1 tổ theo sơ đồ chưa có dữ liệu → mở lại `GET ?workshopId=X` | Tổ đó **không** tự xuất hiện lại; nằm trong `deleted` | |
| 4.8 | Q | `POST` tiền tố trùng tiền tố đã có trong xưởng X (không phân biệt hoa thường) | 400 lỗi `codePrefix` | |
| 4.9 | Q | `parentOrgUnitId` là một tổ / kíp; hoặc bỏ trống `displayName` | 400 lỗi `parentOrgUnitId` / `displayName` | |
| 4.10 | | `GET /api/work-report-units?workshopId=X` | Theo thứ tự; mỗi đơn vị có `engineers` (đang rỗng) | |
| 4.11 | Q | `PUT /api/work-report-units/reorder` `{ "workshopId": X, "orderedIds": [U_K, U_T, …đủ mọi đơn vị của X] }` | 200; danh sách đổi thứ tự | |
| 4.12 | Q | `reorder` thiếu 1 Id | 400 "Danh sách sắp xếp phải gồm đủ…" | |
| 4.13 | Q | `PUT /api/work-report-units/{U_T}` đổi `displayName` | Form tuần đang chạy + tuần sau đổi `UnitName` (SQL) | |

```json
{ "parentOrgUnitId": <Id đội>, "displayName": "Tổ Cơ khí chung", "codePrefix": "CKC", "laborType": "HC" }
```

## B5. Kỹ sư phụ trách

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 5.1 | Q | `GET /api/work-report-units/{U_T}/engineer-suggestions` | Kỹ sư cấp KS ở tổ / đội; người của chính tổ xếp trước | |
| 5.2 | Q | `PUT /api/work-report-units/{U_T}/engineers` `{ "employeeIds": [<Id của K>] }` | 200, danh sách có K, `startDate` = hôm nay | |
| 5.3 | | SQL `SELECT EngineerNames FROM WeeklyForm WHERE WorkReportUnitId = U_T` | Có tên K ở các form chưa khóa | |
| 5.4 | D | `PUT …/{U_T}/engineers` | 200 (đội trưởng phân công được **tổ**) | |
| 5.5 | D | `PUT …/{U_K}/engineers` | 403 "Chỉ quản đốc / phó quản đốc được phân công kỹ sư cho kíp." | |
| 5.6 | K | `PUT …/{U_T}/engineers` | 403 | |
| 5.7 | Q | `employeeIds` có người đã nghỉ việc / Id không tồn tại | 400 lỗi `employeeIds` | |
| 5.8 | K | `GET /api/work-reports/my-scope` | Có xưởng X với tổ T: `role` = ENGINEER, `canEdit` = true, `canEditLocked` = false | |

## B6. Bảng công việc & form (K)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 6.1 | `GET /api/work-reports/grid?workshopId=X&weekId=W_KH&phase=PLAN` | `title` "KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO – …"; `categories` = đầu mục dùng được ở X; `forms` **chỉ** có tổ T (đơn vị K phụ trách): `orderLabel`, `status` OPEN, `canEditNow` true, `engineerNames` có K. **Ghi F_KH** | |
| 6.2 | `grid?…&weekId=W_BC&phase=REPORT` | `status` OPEN. **Ghi F_BC** | |
| 6.3 | `grid?…&weekId=W_BC&phase=PLAN` | `status` LOCKED, `canEditNow` false (đã qua T2 11:00) | |
| 6.4 | `grid?…&weekId=W_KH&phase=REPORT` | `status` NOT_STARTED | |
| 6.5 | Gọi lại 6.1 nhiều lần | SQL: số form không tăng | |
| 6.6 | `phase=ABC` | 400 lỗi `phase` | |
| 6.7 | Q gọi 6.1 | Thấy **mọi** tổ/kíp của X | |

## B7. Lập kế hoạch — `phase=PLAN` (K, form F_KH)

**7.1** `POST /api/work-reports/forms/{F_KH}/items?phase=PLAN`
```json
{
  "workCategoryId": C1,
  "equipmentCode": "<mã có trong danh mục thiết bị>",
  "description": "Kiểm tra, vệ sinh động cơ băng tải",
  "workDate": "<ngày trong tuần W_KH, dạng YYYY-MM-DD>",
  "workers": [ { "employeeId": <Id 1 nhân viên> }, { "displayName": "Hùng" } ],
  "plannedMinutes": 960,
  "note": "Ghi chú"
}
```

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 7.1 | Như trên | 200; `code` = "TCDKB-LV1-01"; `workerCount` 2; người chọn NV hiện họ tên đầy đủ + `empCode`; `equipmentId` có, `equipmentName` từ danh mục; `isUnplanned` false. **Ghi I1, RV1 (= rowVersion)** | |
| 7.2 | Thêm dòng thứ 2 đầu mục C1 → **I2** | `code` đuôi `-02` | |
| 7.3 | `DELETE items/{I2}?phase=PLAN`, rồi thêm dòng C1 mới | Mã mới đuôi **`-03`** (không dùng lại số đã xóa) | |
| 7.4 | `equipmentCode` "ABC-KHONG-CO" | 200, `equipmentId` null, giữ mã gõ | |
| 7.5 | Thiếu `plannedMinutes` | 400 lỗi `plannedMinutes` | |
| 7.6 | Thiếu `description` | 400 lỗi `description` | |
| 7.7 | `workDate` ngoài tuần | 400 lỗi `workDate` | |
| 7.8 | `workers: [{ "employeeId": 999999 }]` | 400 lỗi `workers` | |
| 7.9 | `workCategoryId` = đầu mục đã ngừng / không áp dụng cho X | 400 lỗi `workCategoryId` | |
| 7.10 | Gửi kèm `actualMinutes`, `resultPercent` | 200, hai trường này vẫn null (bỏ qua ở PLAN) | |

**7.11 Sửa dòng** `PUT /api/work-reports/items/{I1}?phase=PLAN`
```json
{ "workCategoryId": C1, "description": "Kiểm tra động cơ (sửa)", "workDate": "<như trên>",
  "workers": [ { "displayName": "Lan" } ], "plannedMinutes": 480, "rowVersion": "RV1" }
```

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 7.11 | Như trên | 200; `rowVersion` mới (**RV2**); `workerCount` 1 | |
| 7.12 | Gửi lại đúng body 7.11 (vẫn RV1) | **409**; `data` = dòng mới nhất (mô tả "… (sửa)") | |
| 7.13 | Bỏ `rowVersion` / gửi chuỗi sai | 400 lỗi `rowVersion` | |
| 7.14 | Chỉ đổi `workers` (dùng RV2) | 200, `rowVersion` vẫn đổi | |
| 7.15 | Đổi `workCategoryId` sang C2 | 200; `code` mới "TCDKB-LV2-01" | |
| 7.16 | Mở 2 tab Swagger, cùng sửa I1 với cùng rowVersion | Tab lưu sau nhận 409 | |

## B8. Dán từ Excel — `items/batch` (K, F_KH)

`POST /api/work-reports/forms/{F_KH}/items/batch?phase=PLAN`
```json
{
  "rows": [
    { "rowIndex": 1, "category": "bt phần ứng", "description": "Sửa bơm", "workDate": "<dd/MM trong tuần>", "workers": "Hùng, Lan", "plannedMinutes": "8h" },
    { "rowIndex": 2, "category": "BT-LV9", "description": "X", "workDate": "abc", "plannedMinutes": "Theo thực tế công việc" },
    { "rowIndex": 3, "category": "LV2", "description": "Bảo dưỡng", "workDate": "<dd/MM/yyyy>", "workers": "<Họ tên đầy đủ 1 NV trong tổ>", "plannedMinutes": "1,5h" }
  ]
}
```

| # | Kết quả đúng | ✔ |
|---|---|---|
| 8.1 | Message "Đã thêm 2 dòng, 1 dòng lỗi cần sửa." | |
| 8.2 | Dòng 1: đầu mục **BT Phản ứng** (khớp dù gõ "Phần"), `plannedMinutes` **960** (2 người × 8h × 60) | |
| 8.3 | Dòng 3: người khớp nhân viên (có `employeeId`), `plannedMinutes` 90 | |
| 8.4 | `errors`: rowIndex 2 với `category`, `workDate`, `plannedMinutes` | |
| 8.5 | Thử thêm: `workDate` "Từ 20h00 ngày dd/MM đến 08h00 ngày dd/MM" → lấy ngày đầu; số ngày Excel (vd "46335") → đúng ngày; `plannedMinutes` "2.700" → 2700 | |

## B9. Vật tư kế hoạch (K, F_KH)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 9.1 | `POST forms/{F_KH}/materials?phase=PLAN` (body dưới) | 200; `workItemCode` = mã của I1; `engineerNames` có K. **Ghi M1** | |
| 9.2 | `workItemId` của form khác | 400 lỗi `workItemId` | |
| 9.3 | `usageDate` ngoài tuần | 400 lỗi `usageDate` | |
| 9.4 | Thiếu `materialName` | 400 | |
| 9.5 | `GET forms/{F_KH}/materials?phase=PLAN` | Có M1 | |

```json
{ "workItemId": I1, "materialCode": "VT001", "materialName": "Mỡ chịu nhiệt", "uom": "kg", "plannedQuantity": 2, "materialPurposeId": P_BTBD }
```

## B10. Báo cáo tuần đang chạy — `phase=REPORT` (form F_BC)

> F_BC là tuần này, kế hoạch đã khóa. Để có dòng kế hoạch thì dùng **Q** (quản đốc sửa được khi khóa).

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 10.1 | K | `POST forms/{F_BC}/items?phase=PLAN` | 400 "Kế hoạch tuần .. của … đã khóa lúc 11:00 …" | |
| 10.2 | Q | Cùng thao tác 10.1 (body kiểu 7.1, ngày trong tuần W_BC) | 200 → **IP** (dòng kế hoạch) | |
| 10.3 | D | Cùng thao tác 10.1 | 400 đã khóa (đội trưởng không sửa khi khóa) | |
| 10.4 | K | `PUT items/{IP}?phase=REPORT`: `actualMinutes` 600, `resultPercent` 100, `workPermit` "co", `fiveS` "Đã dọn dẹp vệ sinh 5S", `explanation` "…", `plannedMinutes` 1 (cố ý), `rowVersion` của IP | 200; `workPermit` "Có"; `plannedMinutes` **không đổi**; `diffMinutes` = 600 − KH | |
| 10.5 | K | `PUT` 10.4 với `workCategoryId` khác | Đầu mục **không đổi** (dòng kế hoạch) | |
| 10.6 | K | `DELETE items/{IP}?phase=REPORT` | 400 "Không xóa dòng kế hoạch ở giai đoạn báo cáo…" | |
| 10.7 | K | `POST forms/{F_BC}/items?phase=REPORT` đầu mục CPU, `actualMinutes` 120 → **IU** | 200; `isUnplanned` true; `plannedMinutes` null; mã "…-PU-01" | |
| 10.8 | K | Dòng phát sinh thiếu `actualMinutes` | 400 lỗi `actualMinutes` | |
| 10.9 | K | `workPermit` "abc" / `resultPercent` 120 | 400 lỗi `workPermit` / `resultPercent` | |
| 10.10 | K | `PUT items/{IU}?phase=PLAN` | 400 "Dòng phát sinh chỉ sửa ở giai đoạn báo cáo." | |
| 10.11 | K | `DELETE items/{IU}?phase=REPORT` | 200 (dòng phát sinh xóa được) — tạo lại IU để test tiếp | |
| 10.12 | K | `grid?weekId=W_BC&phase=PLAN` | **Không** thấy dòng phát sinh | |
| 10.13 | K | `grid?weekId=W_BC&phase=REPORT` | Có IP + IU; TT đánh lại theo nhóm (A1…, E1); `totalActualMinutes` = tổng thực tế (trống = KH) | |
| 10.14 | K | `POST forms/{F_KH}/items?phase=REPORT` (tuần sau) | 400 "Chưa tới tuần …, chưa nhập báo cáo được" | |

### Vật tư ở báo cáo
| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 10.15 | (Q thêm vật tư kế hoạch cho IP ở `phase=PLAN`) → K `PUT materials/{id}?phase=REPORT` với `actualQuantity` 1.5, `plannedQuantity` 99 | `actualQuantity` 1.5; `plannedQuantity` không đổi | |
| 10.16 | K thêm vật tư cho IU `phase=REPORT` | 200, `isUnplanned` true | |
| 10.17 | K `DELETE` vật tư kế hoạch `phase=REPORT` | 400 "Không xóa vật tư kế hoạch…" | |

## B11. Tổng hợp & vật tư xưởng (Q hoặc G)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 11.1 | `GET /api/work-reports/summary?workshopId=X&weekId=W_KH&phase=PLAN` | `columns` = đầu mục `showInSummary`; mỗi tổ: `minutesByCategory` (key = Id đầu mục) = tổng giờ KH; `totalMinutes`; `manpower` = total ÷ `capacityMinutes`; `materialCodeCount` = số mã VT khác nhau; `total` = cộng các dòng | |
| 11.2 | `summary?…&weekId=W_BC&phase=REPORT` | Cộng giờ **thực tế** (dòng chưa nhập thực tế lấy giờ KH), gồm cả dòng phát sinh | |
| 11.3 | `GET /api/work-reports/materials?workshopId=X&weekId=W_KH&phase=PLAN` | Có M1, kèm tên tổ, mã CV, KTV | |
| 11.4 | K `DELETE items/{I1}?phase=PLAN` → gọi lại 11.3 | M1 biến mất (xóa dòng thì vật tư bị xóa theo) | |

## B12. Gợi ý người thực hiện (K)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 12.1 | `GET /api/work-reports/worker-options?unitId=U_T` | Người của tổ T | |
| 12.2 | `scope=TEAM`, `scope=WORKSHOP` | Danh sách rộng dần; người của tổ T xếp trước | |
| 12.3 | `keyword=hung` | Tìm được "Hùng" (không phân biệt dấu) | |
| 12.4 | `scope=ABC` | 400 | |
| 12.5 | B gọi 12.1 | 403 | |

## B13. Phân quyền tổng hợp

| # | Người | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|---|
| 13.1 | B | `GET grid` xưởng X | 403 | |
| 13.2 | B | `POST forms/{F_KH}/items?phase=PLAN` | 403 | |
| 13.3 | G | `GET grid`, `summary` | 200; thấy mọi tổ; `canEditNow` false | |
| 13.4 | G | `POST …/items` | 403 "Bạn không có quyền nhập/sửa…" | |
| 13.5 | AD (không phải quản đốc) | `POST …/items` | 403 (admin không nhập dữ liệu) | |
| 13.6 | Q | Thêm/sửa dòng ở form đã khóa | 200 | |
| 13.7 | D | Thêm dòng ở form đang mở của tổ trong đội | 200 | |
| 13.8 | Q | Bỏ K khỏi kỹ sư tổ T (`PUT engineers` `{ "employeeIds": [] }`) → K `POST …/items` | 403 (mất quyền ngay) | |

## B14. Đồng bộ form khi thay đổi cấu hình (Q / AD)

| # | Thao tác | Kết quả đúng | ✔ |
|---|---|---|---|
| 14.1 | Phân công lại K (+ kỹ sư thứ 2) | `grid` tuần đang chạy: `engineerNames` có cả hai ngay | |
| 14.2 | Đổi tiền tố tổ T khi form tuần sau **chưa có dòng** | Form tuần sau dùng tiền tố mới; form đã cấp mã giữ tiền tố cũ | |
| 14.3 | Đổi `laborType` HC → KIP | `capacityMinutes` form chưa khóa = 2467.44 | |
| 14.4 | AD đổi `hcMinutesPerWeek` (rồi đặt lại 2700) | Form HC chưa khóa nhận số mới | |
| 14.5 | Ngừng đơn vị (`PUT` với `isActive: false`) | Form **trống** tuần sau bị xóa mềm; form có dữ liệu giữ nguyên | |
| 14.6 | Bật lại đơn vị | Form tuần đang chạy + tuần sau được tạo lại | |
| 14.7 | Bật lại đơn vị khi tổ đã ngừng trên sơ đồ | 400 "… đã ngừng trên sơ đồ tổ chức …" | |
| 14.8 | Khởi động lại Server, chờ 15 giây | Log không lỗi "Không đồng bộ được form…"; form đủ cho mọi đơn vị | |

## B15. Dọn dữ liệu test (tùy chọn)

- Đầu mục thử: `PATCH /api/work-categories/{id}/active` `{ "isActive": false }` (không xóa).
- Đơn vị thử: `PUT /api/work-report-units/{id}` với `isActive: false`.
- Dòng / vật tư thử: `DELETE` qua API (xóa mềm).
- **Không** xóa thẳng bằng SQL trên môi trường thật.

---

## Lỗi gặp khi test

| Bước | Người | Mô tả lỗi (API, body, kết quả nhận được) | Đã sửa |
|---|---|---|---|
| | | | |
