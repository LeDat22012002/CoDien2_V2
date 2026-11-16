# TEST GĐ 2 – FORM NHẬP BÁO CÁO CÔNG VIỆC TUẦN (Swagger)

> Mục đích: kiểm tra BE GĐ 2 trước khi người dùng **xác nhận**. Đánh ✅ / ❌ vào từng bước, ghi lỗi gặp vào cuối file.
> Nghiệp vụ: `Docs/HUONG_DAN_BAO_CAO_TUAN.md` mục 3, 8, 13.
>
> **Lưu ý 16/11/2026:** kế hoạch / báo cáo đã tách bảng và API (HUONG_DAN mục 16). Các bước dùng `?phase=`, `items/batch` trong file này **không còn đúng**; test theo `Docs/HUONG_DAN_TEST_BAO_CAO_TUAN.md` phần C.

---

## 0. Chuẩn bị

1. Pull code → `dotnet ef database update` (áp migration `AddWorkReportsForms`) → chạy Server.
2. Kiểm tra bảng mới:
   ```sql
   SELECT name FROM sys.tables WHERE name IN ('WeeklyForm','WorkItem','WorkItemWorker','WorkMaterial','WorkItemCodeCounter');
   ```
   → đủ 5 bảng.
3. Cần sẵn (làm theo TEST GĐ 1):
   - 1 xưởng X có ít nhất 1 **tổ** (`GROUP`) đã là đơn vị báo cáo, tiền tố vd `TCDKB`.
   - Tài khoản **A** là kỹ sư phụ trách tổ đó (`PUT /api/work-report-units/{id}/engineers`).
   - Tài khoản **Q** là quản đốc/phó xưởng X trên sơ đồ.
   - Tài khoản **B** không liên quan xưởng X, không có quyền `work-reports.*`.
   - **G** (Ban Giám đốc): không cần tài khoản, xem trang công khai `/work-reports` (API `/api/work-reports/public/*`).
4. Lấy Id tuần: `GET /api/work-weeks/current?workshopId={X}` → ghi `reportWeek.id` (= **W_BC**) và `planWeek.id` (= **W_KH**).
5. Lấy Id đầu mục: `GET /api/work-categories?workshopId={X}` → ghi Id của `BT-LV1` (= **C1**), `BT-LV2` (= **C2**), `BT Phản ứng` (= **CPU**).

Quy ước: `phase=PLAN` = kế hoạch, `phase=REPORT` = báo cáo.

---

## 1. Lưới & tự tạo form (đăng nhập A)

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 1.1 | `GET /api/work-reports/grid?workshopId={X}&weekId={W_KH}&phase=PLAN` | 200. `title` = "KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO – {Xưởng} · Tuần .. Tháng ..". `forms` có tổ của A: `orderLabel` = "I"…, `status` = `OPEN`, `canEditNow` = true, `engineerNames` có tên A, `capacityMinutes` = 2700 (HC). Ghi `formId` = **F_KH** |
| 1.2 | SQL `SELECT * FROM WeeklyForm WHERE IsDeleted = 0` | Có form cho tuần báo cáo + tuần kế hoạch (và tuần trước nếu báo cáo tuần trước chưa khóa) của mọi đơn vị đang dùng |
| 1.3 | Gọi lại 1.1 | Không tạo thêm form (số dòng SQL không đổi) |
| 1.4 | `GET grid?...&weekId={W_BC}&phase=REPORT` | `status` = `OPEN` (đang trong tuần, trước hạn). Ghi `formId` = **F_BC** |
| 1.5 | `GET grid?...&weekId={W_BC}&phase=PLAN` | Kế hoạch tuần này `status` = `LOCKED` (đã qua T2 11:00), `canEditNow` = false (A là kỹ sư) |
| 1.6 | `phase=ABC` | 400, lỗi `phase` |
| 1.7 | `workshopId` = Id một tổ (không phải xưởng) | 404 "Không tìm thấy xưởng." |

## 2. Thêm / sửa / xóa dòng kế hoạch (A, form F_KH)

**2.1** `POST /api/work-reports/forms/{F_KH}/items?phase=PLAN`
```json
{
  "workCategoryId": C1,
  "equipmentCode": "MÃ-THIẾT-BỊ-CÓ-TRONG-DANH-MỤC",
  "description": "Kiểm tra, vệ sinh động cơ băng tải",
  "workDate": "YYYY-MM-DD (một ngày trong tuần W_KH)",
  "workers": [ { "employeeId": <Id 1 nhân viên> }, { "displayName": "Hùng" } ],
  "plannedMinutes": 960,
  "note": "Ghi chú"
}
```
→ 200. `code` = `{Tiền tố}-LV1-01`; `workerCount` = 2; người chọn nhân viên hiện **họ tên đầy đủ** + `empCode`; `equipmentId` có giá trị và `equipmentName` lấy từ danh mục; `isUnplanned` = false; có `rowVersion`. Ghi Id = **I1**, rowVersion = **RV1**.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 2.2 | Thêm dòng thứ 2 cùng đầu mục C1 | `code` đuôi `-02` (= **I2**) |
| 2.3 | `DELETE /items/{I2}?phase=PLAN` rồi thêm dòng C1 mới | Mã mới đuôi **`-03`** (không dùng lại `-02`) |
| 2.4 | Thêm dòng `equipmentCode` = "ABC-KHONG-CO" | 200, `equipmentId` = null, giữ mã gõ |
| 2.5 | Thêm dòng thiếu `plannedMinutes` | 400, lỗi `plannedMinutes` |
| 2.6 | `workDate` ngoài tuần | 400, lỗi `workDate` "phải trong tuần …" |
| 2.7 | Thiếu `description` | 400, lỗi `description` |
| 2.8 | `workers: [{ "employeeId": 999999 }]` | 400, lỗi `workers` |
| 2.9 | `workCategoryId` của đầu mục đã ngừng / không áp dụng cho xưởng | 400, lỗi `workCategoryId` |
| 2.10 | Gửi kèm `actualMinutes`, `resultPercent` ở PLAN | 200, các trường này **bị bỏ qua** (vẫn null) |

**2.11 Sửa dòng** `PUT /api/work-reports/items/{I1}?phase=PLAN`
```json
{
  "workCategoryId": C1,
  "description": "Kiểm tra động cơ (sửa)",
  "workDate": "...",
  "workers": [ { "displayName": "Lan" } ],
  "plannedMinutes": 480,
  "rowVersion": "RV1"
}
```
→ 200, `rowVersion` mới (= **RV2**), `workerCount` = 1.

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 2.12 | Gửi lại đúng body 2.11 (vẫn `RV1`) | **409**, `data` = dòng mới nhất (mô tả "… (sửa)") |
| 2.13 | Thiếu / sai `rowVersion` | 400, lỗi `rowVersion` |
| 2.14 | Chỉ đổi `workers` (dùng `RV2`) | 200, `rowVersion` **vẫn đổi** |
| 2.15 | Đổi `workCategoryId` sang C2 | 200, `code` mới `{Tiền tố}-LV2-xx` |
| 2.16 | Hai tab Swagger cùng sửa I1 với cùng rowVersion | Tab lưu sau nhận 409 |

## 3. Dán từ Excel (A, F_KH)

`POST /api/work-reports/forms/{F_KH}/items/batch?phase=PLAN`
```json
{
  "rows": [
    { "rowIndex": 1, "category": "bt phần ứng", "description": "Sửa bơm", "workDate": "dd/MM (ngày trong tuần)", "workers": "Hùng, Lan", "plannedMinutes": "8h" },
    { "rowIndex": 2, "category": "BT-LV9", "description": "X", "workDate": "abc", "plannedMinutes": "Theo thực tế công việc" },
    { "rowIndex": 3, "category": "LV2", "description": "Bảo dưỡng", "workDate": "dd/MM/yyyy", "workers": "<Họ tên đầy đủ 1 NV trong tổ>", "plannedMinutes": "1.5h" }
  ]
}
```
→ 200, message "Đã thêm 2 dòng, 1 dòng lỗi cần sửa."
- Dòng 1: đầu mục **BT Phản ứng** (khớp dù gõ "Phần"), `plannedMinutes` = **960** (2 người × 8h × 60).
- Dòng 3: người khớp nhân viên (có `employeeId`), `plannedMinutes` = 90.
- `errors`: `rowIndex` 2 với lỗi `category`, `workDate`, `plannedMinutes`.

Thêm: ngày dạng "Từ 20h00 ngày dd/MM đến 08h00 ngày dd/MM" → lấy ngày đầu; số ngày Excel (vd `46335`) → đổi đúng ngày.

## 4. Báo cáo (A, form F_BC – tuần đang chạy)

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 4.1 | Nếu F_BC chưa có dòng kế hoạch: đăng nhập **Q**, thêm 1 dòng `phase=PLAN` vào F_BC (quản đốc sửa được khi khóa) → **IP** | 200 |
| 4.2 | (A) `POST forms/{F_BC}/items?phase=PLAN` | 400 "Kế hoạch tuần .. đã khóa lúc …" |
| 4.3 | (A) `PUT items/{IP}?phase=REPORT` đổi `actualMinutes` 600, `resultPercent` 100, `workPermit` "co", `fiveS` "Đã dọn dẹp vệ sinh 5S", `plannedMinutes` 1 (cố ý) | 200; `workPermit` = "Có"; `plannedMinutes` **không đổi**; `diffMinutes` = 600 − KH |
| 4.4 | (A) `DELETE items/{IP}?phase=REPORT` | 400 "Không xóa dòng kế hoạch ở giai đoạn báo cáo…" |
| 4.5 | (A) Thêm dòng phát sinh `POST forms/{F_BC}/items?phase=REPORT` đầu mục CPU, `actualMinutes` 120 | 200, `isUnplanned` = true, `plannedMinutes` = null, mã `…-PU-01` |
| 4.6 | Thêm dòng phát sinh thiếu `actualMinutes` | 400, lỗi `actualMinutes` |
| 4.7 | `workPermit` = "abc" | 400, lỗi `workPermit` |
| 4.8 | `resultPercent` = 120 | 400, lỗi `resultPercent` |
| 4.9 | `GET grid?weekId={W_BC}&phase=PLAN` | **Không** thấy dòng phát sinh |
| 4.10 | `GET grid?weekId={W_BC}&phase=REPORT` | Thấy cả dòng KH và phát sinh; TT đánh lại trong từng nhóm đầu mục (A1, A2…, E1) |
| 4.11 | `PUT items/{dòng phát sinh}?phase=PLAN` | 400 "Dòng phát sinh chỉ sửa ở giai đoạn báo cáo." |
| 4.12 | Báo cáo tuần **sau** (W_KH) `POST …?phase=REPORT` | 400 "Chưa tới tuần …, chưa nhập báo cáo được" |

## 5. Vật tư

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 5.1 | (A) `POST forms/{F_KH}/materials?phase=PLAN` `{ "workItemId": I1, "materialCode": "VT001", "materialName": "Mỡ chịu nhiệt", "uom": "kg", "plannedQuantity": 2, "materialPurposeId": <Id BTBD> }` | 200, `workItemCode` = mã của I1, `engineerNames` có A |
| 5.2 | `workItemId` của form khác | 400, lỗi `workItemId` |
| 5.3 | `usageDate` ngoài tuần | 400 |
| 5.4 | (REPORT, form F_BC) thêm vật tư cho dòng phát sinh với `actualQuantity` | 200, `isUnplanned` = true |
| 5.5 | Xóa vật tư kế hoạch ở `phase=REPORT` | 400 "Không xóa vật tư kế hoạch…" |
| 5.6 | `GET /api/work-reports/materials?workshopId={X}&weekId={W_KH}&phase=PLAN` | Có vật tư 5.1 |
| 5.7 | `DELETE items/{I1}?phase=PLAN` | Vật tư 5.1 cũng biến mất khỏi 5.6 |

## 6. Tổng hợp

`GET /api/work-reports/summary?workshopId={X}&weekId={W_KH}&phase=PLAN`
- `columns` = đầu mục có `showInSummary`.
- Mỗi dòng: `minutesByCategory` (key = Id đầu mục) = tổng (11) theo đầu mục; `totalMinutes`; `manpower` = total ÷ `capacityMinutes` (làm tròn 2 số); `materialCodeCount` = số mã vật tư khác nhau.
- `total` = cộng các dòng.
- `phase=REPORT` cộng (12), trống thì lấy (11).

## 7. Gợi ý người thực hiện

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 7.1 | `GET /api/work-reports/worker-options?unitId={unit}` | Người của tổ (scope mặc định UNIT) |
| 7.2 | `scope=TEAM` / `scope=WORKSHOP` | Danh sách rộng dần; người của tổ xếp trước |
| 7.3 | `keyword=hung` | Tìm được "Hùng" (không phân biệt dấu) |
| 7.4 | `scope=ABC` | 400 |

## 8. Phân quyền

| # | Người | Thao tác | Kết quả đúng |
|---|---|---|---|
| 8.1 | B | `GET grid` xưởng X | 403 |
| 8.2 | B | `POST forms/{F_KH}/items?phase=PLAN` | 403 |
| 8.3 | G (BGĐ) | `GET grid`, `summary` | 200, thấy mọi tổ, `canEditNow` = false |
| 8.4 | G | `POST …/items` | 403 "Bạn không có quyền nhập/sửa…" |
| 8.5 | Admin (`configure`, không phải quản đốc) | `POST …/items` | 403 (admin không nhập dữ liệu) |
| 8.6 | Q | Thêm dòng vào form đã khóa (kế hoạch tuần này) | 200 (quản đốc sửa được khi khóa) |
| 8.7 | Đội trưởng của đội chứa tổ | Thêm dòng khi khóa | 400 "… đã khóa …" |
| 8.8 | A sau khi bị bỏ khỏi kỹ sư phụ trách | `POST …/items` | 403 |

## 9. Đồng bộ form theo cấu hình

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 9.1 | Đổi kỹ sư phụ trách tổ (thêm kỹ sư C) | `GET grid` tuần đang chạy: `engineerNames` có C ngay |
| 9.2 | `PUT /api/work-report-units/{id}` đổi `displayName` | Form tuần đang chạy / tuần sau đổi tên; form tuần đã khóa giữ tên cũ |
| 9.3 | Đổi tiền tố khi form tuần sau **chưa có dòng nào** | Form tuần sau dùng tiền tố mới; form đã có mã giữ tiền tố cũ |
| 9.4 | Đổi `laborType` HC → KIP | `capacityMinutes` form chưa khóa = 2467.44 |
| 9.5 | Ngừng đơn vị (`isActive: false`) | Form **trống** tuần sau bị xóa mềm; form có dữ liệu giữ nguyên |
| 9.6 | Bật lại đơn vị | Form tuần đang chạy + tuần sau được tạo lại |
| 9.7 | Bật lại đơn vị khi tổ đã ngừng trên sơ đồ | 400 "… đã ngừng trên sơ đồ tổ chức …" |
| 9.8 | Đổi `hcMinutesPerWeek` trong cấu hình | Form HC chưa khóa nhận số mới |

## 10. Rà soát GĐ 1 (đã sửa 15/11)

| # | Thao tác | Kết quả đúng |
|---|---|---|
| 10.1 | `PUT /api/work-weeks/{id}/deadline` hạn kế hoạch **sau** hạn báo cáo | 400, lỗi `planDeadlineAt` |
| 10.2 | `GET /api/work-report-units/deleted?workshopId={Id một đội}` | 404 |

---

## Lỗi gặp khi test

| Bước | Mô tả lỗi | Đã sửa |
|---|---|---|
| | | |
