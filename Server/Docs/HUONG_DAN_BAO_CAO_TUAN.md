# HƯỚNG DẪN CHỨC NĂNG — KẾ HOẠCH & BÁO CÁO CÔNG VIỆC TUẦN (module `WorkReports`)

> **Tài liệu sống.** Đây là nguồn tham chiếu chính cho chức năng báo cáo công việc tuần.
> Mỗi khi xong một phần (người dùng **xác nhận**) hoặc có bổ sung nghiệp vụ: cập nhật **Trạng thái**, nội dung liên quan và **Nhật ký thay đổi** ở cuối file.
> Context mới: đọc `Docs/TIEP_TUC_CONG_VIEC.md` (bàn giao: trạng thái, cách làm việc, việc tiếp theo) → file này → `CLAUDE.md` (quy ước code chung) rồi mới sửa code.

---

## 0. Trạng thái hiện tại

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Phân tích nghiệp vụ | ✅ Đã chốt (14/11/2026) | Mục 1–6 |
| Thiết kế dữ liệu + API GĐ 1–2 | ✅ Đã chốt | Mục 7–9; quyết định bổ sung GĐ 2 ở mục 13.4 |
| GĐ 1 – Nền tảng (BE) | 🔵 Xong code, đã rà soát & sửa (15/11), chờ xác nhận | Mục 12 |
| GĐ 2 – Form nhập (BE) | 🔵 Xong code (trừ xuất Excel), chờ xác nhận | Migration `AddWorkReportsForms`; test `Docs/TEST_GD2_BAO_CAO_TUAN.md`. Mục 13 |
| GĐ 2 – Xuất Excel | ⬜ Làm bước cuối | Cần file mẫu chính thức (nhiều sheet theo tổ + Tổng hợp + Vật tư) |
| GĐ 3 – Quy trình (lịch sử, cảnh báo) | ⬜ Chưa làm | Mở khóa (admin) đã làm ở mục 16; **bỏ yêu cầu chỉnh sửa** (16/11/2026) |
| GĐ 4 – Cộng tác thời gian thực (SignalR) | 🔵 Cập nhật tức thì (16/11) + "ai đang sửa", xử lý xung đột, vật tư chống ghi đè (17/11) đã xong code, chờ xác nhận | Mục 17, 20 |
| GĐ 5 – Màn hình xưởng & nhà máy, dashboard | ⬜ Chưa làm | |
| FE (Client) GĐ 1–2 | 🔵 Xong code, chờ xác nhận | Module `Client/src/modules/workReports`; lưới bằng AntD Table (không thêm thư viện). Mục 15 |
| Tách kế hoạch / báo cáo, quyền thêm/sửa/xóa, mở khóa (16/11) | 🔵 Xong code BE + FE, chờ xác nhận | Migration `SplitWorkPlanReport` (chưa chạy lên DB). Mục 16 |

Ký hiệu: ⬜ chưa làm · 🟡 đang làm · 🔵 xong, chờ xác nhận · ✅ đã xác nhận.

---

## 1. Bối cảnh & mục tiêu

- Hiện mỗi xưởng lập **2 file Excel mỗi tuần**:
  - **Kế hoạch công việc tuần tiếp theo** (12 cột).
  - **Báo cáo công việc tuần đã thực hiện** (18 cột = 12 cột kế hoạch + Thực tế, Chênh lệch, Kết quả %, GPLV, 5S, Diễn giải).
- Mỗi tổ/kíp một sheet; thêm sheet **Tổng hợp dữ liệu**, **Vật tư sử dụng**, **HD nhập liệu**.
- Mẫu tham khảo: X.CĐNĐ1 (Tuần 01, 02 tháng 11/2026) và ảnh báo cáo X.CĐLG1 (Tuần 46/2026).
- Mục tiêu: chuyển lên web, nhập dạng lưới **như Google Sheet**, nhiều kỹ sư cùng nhập một form kíp, khóa theo hạn, phân quyền theo sơ đồ tổ chức, Ban Giám đốc xem trực tiếp trên màn hình chính (không gửi file).

### Lỗi của file Excel hiện tại (hệ thống phải loại bỏ)

- Công thức Tổng hợp tham chiếu sai sheet hoặc `#REF!`.
- Dropdown lẫn "BT **Phần** ứng" / "BT **Phản** ứng" → SUMIFS bỏ sót.
- Mã công việc trùng (1 mã cho ~13 dòng), sai quy ước, lúc có lúc không số 0 đứng trước.
- Ngày thực hiện 3 kiểu (ngày, chuỗi, chuỗi khoảng ca); chênh lệch lúc `K−L` lúc `L−K`; kế hoạch ghi chữ "Theo thực tế công việc".
- GPLV/5S chữ tự do nhiều biến thể; tên tổ/KTV không khớp giữa các sheet; vật tư không gắn mã CV.
- Tên người thực hiện chữ tự do, trùng tên ngắn ("Hùng, Hùng").
- Thứ tự nhóm đầu mục lộn (H trước E); TT nhảy cóc / bỏ trống.

---

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Đơn vị báo cáo (Unit) | Một tổ (`GROUP`) hoặc một kíp (`SHIFT`, ca A/B/C) có form tuần riêng; tương ứng một "sheet tổ" trong Excel |
| Form tuần (WeeklyForm) | Dữ liệu của 1 đơn vị trong 1 tuần, gồm 2 giai đoạn **Kế hoạch** và **Báo cáo** |
| Dòng công việc | 1 dòng trên lưới. **Từ 16/11/2026 tách 2 bảng**: dòng kế hoạch (`WorkPlanItem`) và dòng báo cáo (`WorkReportItem`) — mục 16 |
| Dòng phát sinh | Dòng thêm ở giai đoạn báo cáo, không có trong kế hoạch (`IsUnplanned`) |
| Đầu mục công việc (WorkCategory) | Nhóm A–I: BT-LV1…LV4, BT phản ứng, PHNB, CTCT, 5S, Khác |
| KTV / Kỹ sư phụ trách | Kỹ sư được phân công nhập form của tổ/kíp |
| HC / KIP | Loại giờ công: hành chính / theo ca; quyết định hằng số quy đổi nhân lực |

---

## 3. Nghiệp vụ đã chốt

### 3.1 Vòng đời một tuần

- **Một việc kế hoạch = một dòng**: lập ở tuần N−1, sang tuần N điền phần thực tế; giai đoạn báo cáo được **thêm dòng phát sinh**.
- Công việc (kể cả phát sinh) **có thể vào Chủ nhật**.
- **Hạn nộp mặc định: thứ 2, 11:00.** Cùng một thời điểm khóa:
  - **Báo cáo tuần N** (hạn = thứ 2 của tuần N+1, 11:00).
  - **Kế hoạch tuần N+1** (hạn = thứ 2 của tuần N+1, 11:00).
- **Báo cáo tuần N mở từ 00:00 thứ 2 của tuần N** (nhập dần trong tuần); trước đó không nhập được báo cáo. Kế hoạch mở ngay khi form được tạo.
- **Admin chỉnh được hạn trên web** (theo tuần, toàn nhà máy hoặc riêng xưởng).
- **Cảnh báo trước 1–2 ngày** (thứ 7, Chủ nhật), **chỉ trên web** (banner trên form + thông báo).
- Đến hạn → **khóa form**. Quản đốc **mở khóa**, **yêu cầu điều chỉnh** hoặc **sửa trực tiếp**.
- **Không có nút "Nộp"** ở GĐ 2: trạng thái chỉ là Chưa tới / Đang nhập / Đã khóa (suy ra từ hạn). Nút Nộp (nếu cần) xem xét ở GĐ 3.
- Sau khi chốt, số liệu **hiển thị trên màn hình chính** cho Ban Giám đốc (không gửi file).

```
KẾ HOẠCH (lập trong tuần N−1 cho tuần N):
  Đang nhập ──(thứ 2 11:00 tuần N: tự khóa)──► Đã khóa
      ▲                                         │
      └──── Mở khóa / Yêu cầu sửa (quản đốc) ◄──┘

BÁO CÁO (trong tuần N, mở từ 00:00 thứ 2 tuần N):
  Đang nhập ──(thứ 2 11:00 tuần N+1: tự khóa)──► Đã khóa ──► hiển thị BGĐ
      ▲                                          │
      └──── Mở khóa / Yêu cầu sửa (quản đốc) ◄───┘
```

Sáng thứ 2 tuần N trước 11:00: kế hoạch tuần N **và** báo cáo tuần N cùng mở (cùng sửa các dòng; xung đột ghi xử lý bằng rowVersion).

### 3.2 Quy tắc tuần

- Tuần **thứ 2 → Chủ nhật**, đánh số theo **tuần ISO trong năm** (theo X.CĐLG1).
- Nhãn hiển thị: `Tuần 46 · Tháng 11/2026 · 09/11–15/11`. **Tháng lấy theo ngày thứ 2** (tuần vắt tháng tính về tháng trước).
- Cuối năm, tuần ISO 01 có thể bắt đầu cuối tháng 12 → luôn hiển thị kèm khoảng ngày (vd `Tuần 01/2026 · Tháng 12/2025 · 29/12–04/01`).
- Ca đêm vắt qua ngày (vd 20h CN → 08h thứ 2) tính vào tuần của **ngày bắt đầu ca**.

### 3.3 Cột của form (đúng theo sheet)

| Cột | Tên | Kế hoạch | Báo cáo |
|---|---|---|---|
| (1) | TT | tự đánh trong nhóm | tự đánh |
| (2) | Tổ thực hiện | tự hiện | tự hiện |
| (3) | Công việc thực hiện | dropdown đầu mục | khóa (dòng KH); dropdown (dòng phát sinh) |
| (4) | Mã công việc | tự sinh | tự sinh |
| (5) | Equipment | chọn danh mục hoặc gõ | như KH |
| (6) | Hạng mục công việc | nhập (bắt buộc) | nhập |
| (7) | Ngày thực hiện | nhập (bắt buộc, trong tuần, gồm CN) | nhập |
| (8) | Số người thực hiện | tự đếm từ (9) | tự đếm |
| (9) | Tên người thực hiện | chọn nhân viên **hoặc gõ tự do** | như KH |
| (10) | Tên KTV phụ trách | tự hiện (danh sách, kíp có thể 2 người) | tự hiện |
| (11) | Giờ công theo kế hoạch (phút) | **nhập (bắt buộc)** | khóa |
| (12) | Giờ công theo thực tế (phút) | ẩn | **nhập** (mặc định = KH; dòng phát sinh bắt buộc) |
| (13) | Chênh lệch | ẩn | tự tính = Thực tế − Kế hoạch |
| (14) | Kết quả thực hiện (%) | ẩn | nhập 0–100, hiển thị "100%" |
| (15) | GPLV | ẩn | dropdown **Có / Không / trống** |
| (16) | 5S | ẩn | ô chữ, gợi ý "Đã dọn dẹp vệ sinh 5S" (**không dùng số** như LG) |
| (17) | Diễn giải | ẩn | nhập |
| (18) | Ghi chú | nhập | nhập |
| — | Tuần | tự hiện "Tuần 46" | tự hiện |

- Ô phút hiểu cú pháp `8h` → tự đổi thành `số người × 8 × 60`; gõ số trần = số phút. API thường nhận **số phút**; FE tự đổi `8h`; API dán Excel (batch) tự đổi.
- Tiêu đề: `BÁO CÁO CÔNG VIỆC – {Xưởng} · Tuần 46 Tháng 11/2026` hoặc `KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO – …`.

### 3.4 Mã công việc

- Dạng `{Tiền tố đơn vị}-{Hậu tố đầu mục}-{STT 2 chữ số}`, vd `TCDKB-LV3-73`, `C-TBMP-LV2-01`.
- **Mỗi dòng một mã** (việc nhiều ngày → mỗi ngày một dòng, một mã; theo LG).
- STT = lớn nhất trong (form, đầu mục) + 1; **không dùng lại** số đã cấp kể cả khi xóa dòng (bộ đếm `WorkItemCodeCounter`).
- Đổi đầu mục của dòng → cấp mã mới; vật tư bám theo dòng nên không mất liên kết.
- Tiền tố cấu hình theo từng đơn vị (mỗi xưởng tự đặt). Form dùng tiền tố **đã chụp**; đổi tiền tố chỉ áp dụng cho form chưa cấp mã nào.

### 3.5 Đầu mục công việc (mặc định A→I)

| Nhóm | Tên | Dropdown | Hậu tố |
|---|---|---|---|
| A | Bảo trì level 1 | BT-LV1 | LV1 |
| B | Bảo trì level 2 | BT-LV2 | LV2 |
| C | Bảo trì level 3 | BT-LV3 | LV3 |
| D | Bảo trì level 4 | BT-LV4 | LV4 |
| E | Bảo trì phản ứng | BT Phản ứng | PU |
| F | Phục hồi nội bộ | PHNB | PHNB |
| G | CTCT | CTCT | CTCT |
| H | 5S | 5S | 5S |
| I | Công việc khác | Khác | KHAC |

- **Dùng chung toàn nhà máy**, mỗi đầu mục có **danh sách xưởng áp dụng** (trống = mọi xưởng) vì có thể phát sinh riêng theo xưởng.
- Admin quản lý trên web; đầu mục đã có dữ liệu chỉ **ngừng dùng**, không xóa; đổi hậu tố không đổi mã đã sinh.
- Cột trên Tổng hợp **sinh động theo danh mục** (`ShowInSummary`).
- **Bảo trì phản ứng**: sửa chữa sau khi thiết bị hỏng/sự cố (run-to-failure, hỏng ngoài kế hoạch); do nhóm HC hoặc kíp thực hiện.

### 3.6 Tổng hợp & vật tư

- Tổng hợp xưởng: mỗi đơn vị 1 dòng — KTV phụ trách, **số đầu mã vật tư** (đếm mã khác nhau, không cộng số lượng; vật tư chưa có mã đếm theo tên), phút công theo từng đầu mục, tổng phút, **nhân lực quy đổi** = tổng phút ÷ giờ công hiệu dụng/tuần, trạng thái.
  - Kế hoạch cộng cột (11), báo cáo cộng cột (12) (trống = (11)).
  - Tổng phút = mọi dòng (kể cả đầu mục không hiện cột).
  - HC = `7.5 × 60 × 6` = **2.700 phút**; KIP = `((2×10×7/3 × 4.33) − 24) / 4.33 × 60` ≈ **2.467,44 phút**. Admin chỉnh được; **chụp vào form** (cập nhật khi form chưa khóa báo cáo).
- Vật tư: Mã CV (bắt buộc, gắn dòng công việc), Mã VT, Tên VT (bắt buộc), ĐVT, Số lượng (KH / thực tế, mặc định = KH), KTV, Ghi chú, Ngày sử dụng, Mục đích (BTBD, BTSC, TTTX, THTX, Phục hồi, VTDP, Gói thầu, CTCT).
- **Vật tư ở kế hoạch**: nhập vật tư dự kiến (số lượng KH); sang báo cáo điền số thực tế và thêm vật tư phát sinh. Vật tư kế hoạch không xóa ở báo cáo (nhập thực tế 0).

---

## 4. Liên kết sơ đồ tổ chức

- Cây đơn vị có sẵn: `FACTORY` → `WORKSHOP` (Xưởng) → `TEAM` (Đội) / `SHIFT` (Nhóm theo ca, `OrgUnit.Shift` = A/B/C, `SingleHead = false` cho nhiều KS) → `GROUP` (Tổ).
- **Đơn vị báo cáo** = một `GROUP` hoặc `SHIFT`, kèm: tiền tố mã, loại giờ công HC/KIP, thứ tự I, II… trong xưởng, tên hiển thị.
- **Kỹ sư phụ trách** lưu ở bảng riêng `WorkReportUnitEngineer` (nhiều–nhiều, có lịch sử), áp dụng cho cả tổ và kíp:
  - 1 kỹ sư phụ trách nhiều tổ (vd Nguyễn Kim Lộc: Đ-NHLB1, Đ-NHLB2); 1 kíp có nhiều kỹ sư.
  - **Đội trưởng/phó** (trong đội) và **quản đốc/phó** (trong xưởng) được đổi kỹ sư phụ trách.
  - **Kíp không tự đồng bộ** từ sơ đồ: kỹ sư được gán vào kíp trên sơ đồ chỉ là **gợi ý**, phải **quản đốc/phó xác nhận** mới thành người nhập form kíp. Tổ hành chính cũng xác nhận như vậy (đội trưởng/phó hoặc quản đốc/phó).
  - Có nút "Lấy gợi ý từ sơ đồ tổ chức".
  - **Không sửa** quy tắc "1 KS/Tổ" của module Organization; sơ đồ và báo cáo độc lập.
- **Người thực hiện**: gợi ý nhân viên thuộc tổ/kíp; công tắc mở rộng **đội → xưởng**; **cho gõ tên tự do** (danh sách nhân viên chưa đủ).

### 4.1 Thay đổi ở Employees / Organization ảnh hưởng thế nào

Liên kết **một chiều**: WorkReports đọc qua `IOrgUnitService` / `IAssignmentService` / `IEmployeeService` / `IEquipmentService` (không gọi Repository module khác); các module đó không phụ thuộc WorkReports.

| Thay đổi | Ảnh hưởng |
|---|---|
| Thêm/điều chuyển nhân viên vào tổ/kíp | **Tự động**: xuất hiện ngay trong ô chọn người của tổ mới |
| Nhân viên nghỉ | **Tự động**: không còn trong danh sách chọn; dòng cũ giữ tên |
| Thay đội trưởng/quản đốc trên sơ đồ | **Tự động**: phạm vi quyền đi theo người mới |
| Chuyển tổ sang đội khác | **Tự động**: quyền theo đội mới |
| Thêm thiết bị | **Tự động**: chọn được ngay |
| **Tạo tổ/kíp mới** | **Tự động** (đổi 15/11/2026): mỗi tổ/kíp đang hoạt động trên sơ đồ tự thành đơn vị báo cáo (tên, tiền tố gợi ý không trùng trong xưởng — trùng thì thêm `-2`, `-3`; HC/KIP theo loại) khi mở lưới / danh sách đơn vị của xưởng hoặc khi tác vụ nền chạy, kèm form tuần đang chạy + tuần kế hoạch. Quản đốc **xóa** đơn vị không báo cáo (chỉ khi chưa có dữ liệu; đã có → chỉ "Ngừng dùng") → không tự tạo lại, khôi phục ở mục "Đã xóa". Quản đốc **thêm đơn vị tự đặt** (không có trên sơ đồ), gắn với xưởng hoặc 1 đội |
| **Gán kỹ sư mới vào tổ/kíp trên sơ đồ** | **Cần xác nhận**: hiện gợi ý "Kỹ sư chưa phân công". Tổ HC: đội trưởng/phó hoặc quản đốc/phó xác nhận. **Kíp: quản đốc/phó xác nhận** (không tự đồng bộ) |
| Ngừng dùng tổ (`IsActive = false`) | Không tạo form mới; form **trống** của tuần chưa bắt đầu bị bỏ; form có dữ liệu giữ nguyên; Org **không bị chặn** xóa |
| Chuyển tổ sang xưởng khác | Form chưa khóa báo cáo đi theo xưởng mới; form đã khóa giữ xưởng cũ |
| Đổi tên tổ / đổi KTV / đổi loại giờ công | Form chưa khóa báo cáo cập nhật ngay; form đã khóa giữ thông tin cũ |
| Đổi tên nhân viên | Dòng gắn nhân viên hiện tên hiện tại; tên gõ tự do giữ nguyên |

Tác vụ nền (6 giờ/lần): tạo kỳ tuần; tạo đơn vị cho tổ/kíp mới trên sơ đồ; tạo form cho đơn vị đang dùng; cập nhật thông tin chụp của form chưa khóa; bỏ form trống tuần sau của đơn vị đã ngừng. (GĐ 3: đếm "kỹ sư chưa phân công" để cảnh báo.)

---

## 5. Phân quyền

> Cập nhật 16/11/2026 (mục 16): thêm/sửa/xóa tách thành 6 quyền riêng; bỏ "sửa khi khóa" và "yêu cầu chỉnh sửa".
> Cập nhật 17/11/2026 (mục 18): `manage` chỉ còn xem + cấu hình tổ/kíp; **phân công kỹ sư** (`assign-engineers`) và **mở khóa** (`unlock`) là 2 quyền riêng, phạm vi theo chức vụ.

| Vai trò | Phạm vi | Xem | Thêm/sửa/xóa (khi đang mở) | Khi đã khóa | Mở khóa | Cấu hình tổ/kíp | Đổi KS phụ trách |
|---|---|---|---|---|---|---|---|
| Kỹ sư phụ trách (`submit` + phân công) | Tổ/kíp được phân công | ✔ | ✔ **mặc định** (kế hoạch + báo cáo) | ✖ | ✖ | ✖ | ✖ |
| Đội trưởng / Đội phó (`manage`) | Tổ trong đội | ✔ | Chỉ khi admin cấp `plan.*` / `report.*` | ✖ | Khi có `unlock` (tổ trong đội) | ✖ | Khi có `assign-engineers` (tổ HC trong đội) |
| Quản đốc / Phó QĐ (`manage`) | Mọi tổ/kíp trong xưởng | ✔ | Chỉ khi admin cấp `plan.*` / `report.*` | ✖ | Khi có `unlock` (trong xưởng) | ✔ | Khi có `assign-engineers` (trong xưởng) |
| Ban Giám đốc / mọi người | Mọi xưởng | ✔ (không thấy gợi ý từ kế hoạch) | ✖ | ✖ | ✖ | ✖ | ✖ |
| Admin (`configure`) | Toàn bộ | ✔ | Khi được cấp `plan.*` / `report.*` (mọi xưởng) | ✖ | Khi có `unlock` (mọi xưởng) | ✔ | Khi có `assign-engineers` (mọi xưởng) + cấu hình |

- **Mã quyền (gán theo role) quyết định vai trò được dùng**, không có quyền thì dù đứng trên sơ đồ cũng không vào được:
  | Mã quyền | Role gán | Vai trò | Trang |
  |---|---|---|---|
  | `work-reports.submit` | Kỹ sư (`KY_SU`) | Kỹ sư phụ trách: thêm/sửa/xóa kế hoạch, báo cáo tổ/kíp được phân công (không cần 6 quyền dưới) | MEMBER `/member/work-reports` |
  | `work-reports.manage` | Quản đốc, đội trưởng (`QUAN_DOC`…) | Xem đội/xưởng (theo chức vụ trên sơ đồ), cấu hình tổ/kíp (quản đốc) | ADMIN `/admin/work-reports` |
  | `work-reports.assign-engineers` | Admin cấp (quản đốc, đội trưởng…) | Phân công kỹ sư: quản đốc/phó → mọi tổ/kíp của xưởng; đội trưởng/phó → tổ thuộc đội (kíp chỉ quản đốc/phó); có `configure` → mọi xưởng | (tab Đơn vị & kỹ sư) |
  | `work-reports.unlock` | Admin cấp | Mở khóa / khóa lại kế hoạch, báo cáo quá hạn; phạm vi như 6 quyền thêm/sửa/xóa (có `configure` → mọi xưởng) | (nút Mở khóa trên lưới) |
  | `work-reports.plan.create` / `.plan.update` / `.plan.delete` | Admin tự cấp cho role khác | Thêm / sửa / xóa dòng (+ vật tư) **kế hoạch** trong phạm vi trưởng/phó (đội → tổ thuộc đội; xưởng → mọi tổ/kíp; admin → mọi xưởng) | (dùng trên trang của role) |
  | `work-reports.report.create` / `.report.update` / `.report.delete` | Admin tự cấp cho role khác | Như trên cho dòng (+ vật tư) **báo cáo**; `report.create` gồm cả đưa dòng kế hoạch vào báo cáo | |
  | *(không cần quyền)* | Ban Giám đốc, mọi người (kể cả chưa đăng nhập) | Xem mọi xưởng, chỉ xem | PUBLIC `/work-reports` (API `GET /api/work-reports/public/*`) |
  | `work-reports.configure` | Quản trị | Đầu mục, mục đích vật tư, hạn, hằng số, đơn vị mọi xưởng (mở khóa / phân công cần thêm `unlock` / `assign-engineers`) | ADMIN `/admin/work-report-settings` |
- Không còn mã `work-reports.view-factory`: trang xem toàn nhà máy là trang công khai, giống trang Sự cố.
- **Phạm vi** suy ra từ sơ đồ: `WorkReportUnitEngineer` + `vUnitMember` (HEAD/DEPUTY của `TEAM` / `WORKSHOP`), giống cách module Incidents kiểm tra "cùng xưởng". Chức vụ trưởng/phó chỉ được tính khi người dùng có `manage`, `assign-engineers`, `unlock` hoặc 1 trong 6 quyền thêm/sửa/xóa.
- Quyền trên form tính theo **xưởng đã chụp trong form** (tổ đã chuyển xưởng → tuần cũ do quản đốc xưởng cũ quản lý). Kỹ sư phụ trách tính theo **phân công hôm nay**.
- Quá hạn (kế hoạch hoặc báo cáo) thì **không ai sửa được** cho tới khi người có quyền `unlock` mở khóa (đặt thời điểm mở tới, tối đa 30 ngày; có thể khóa lại ngay).
- Mọi API ghi kiểm tra lại phạm vi + quyền + trạng thái khóa ở server; FE chỉ ẩn/hiện nút.

---

## 6. Màn hình

### 6.1 Lưới dùng chung (một component cho mọi vai trò)

```
[ Bảng công việc ]  [ Tổng hợp ]  [ Vật tư xưởng ]
  Tuần: ◀ 46 (09/11–15/11/2026) ▶   Giai đoạn: (•) Báo cáo  ( ) Kế hoạch tuần tới
  Lọc: Tổ/Kíp ▾  Đầu mục ▾  Ngày ▾  Chỉ dòng có yêu cầu sửa ☐
```

- **Một bảng** chứa tất cả tổ/kíp của xưởng theo thứ tự cấu hình (giống ảnh LG): nhóm cấp 1 = tổ/kíp (I, II … XI, kèm trạng thái + hạn), nhóm cấp 2 = đầu mục A–I (tự hiện, thu gọn được, nút "+ Thêm dòng" gán sẵn đầu mục).
- Ô sửa được nền trắng, ô tự tính nền xám, đơn vị đang khóa hiện mờ + biểu tượng khóa. Giữ hàng tiêu đề khi cuộn; **virtual scroll** (500–1.000 dòng/xưởng/tuần).
- Phím Tab/Enter/mũi tên, dropdown, **dán từ Excel** (server chuẩn hóa từng ô; dòng hợp lệ lưu ngay, dòng sai tô đỏ ô lỗi, sửa rồi gửi lại), lưu tự động theo dòng.
- Lưới kế hoạch **không hiện dòng phát sinh**; lưới báo cáo hiện mọi dòng.

| Người xem | Phạm vi lưới | Sửa |
|---|---|---|
| Kỹ sư | Đơn vị mình phụ trách | Khi form mở |
| Đội trưởng/phó | Đơn vị trong đội | Khi form mở; yêu cầu sửa |
| Quản đốc/phó | Toàn xưởng | Luôn; mở khóa; yêu cầu sửa |
| BGĐ / nhà máy | Toàn xưởng | Chỉ đọc |

### 6.2 Màn hình xưởng
- Gồm **Bảng công việc** + 2 tab **Tổng hợp**, **Vật tư xưởng**. Thanh thao tác: mở khóa, yêu cầu sửa, phân công kỹ sư, xuất Excel.

### 6.3 Trang nhà máy (màn hình chính BGĐ)
- Tổng quan tiến độ nộp của tất cả xưởng trong tuần.
- Dashboard **từng xưởng** theo tuần đang chọn.
- Bảng công việc **chỉ đọc** giống ảnh mẫu (chọn xưởng, tuần, Báo cáo / Kế hoạch tuần tới) + Tổng hợp + Vật tư.
- **Không** có so sánh giữa các xưởng, **không** có xu hướng nhiều tuần.
- Mặc định chỉ hiện số liệu **đã chốt**; công tắc "xem cả bản đang nhập" (ghi rõ chưa chốt).

### 6.4 Quản trị
- Đầu mục công việc (kèm danh sách xưởng áp dụng), mục đích vật tư, hằng số HC/KIP.
- Hạn nộp mặc định, số ngày cảnh báo, ghi đè hạn theo tuần/xưởng.
- Đơn vị báo cáo (tự tạo theo sơ đồ; tên, tiền tố, HC/KIP, thứ tự, bật/tắt, xóa / khôi phục, thêm đơn vị tự đặt).

### 6.5 Dashboard từng xưởng (GĐ 5)
- Tỷ lệ hoàn thành kế hoạch (số dòng đạt 100%, trung bình Kết quả %).
- Giờ công KH vs thực tế theo tổ/đầu mục; cơ cấu giờ công theo đầu mục (BT phản ứng cao = bảo trì phòng ngừa chưa tốt).
- Nhân lực quy đổi so với quân số; việc phát sinh theo kíp; thiết bị tốn nhiều giờ công (liên kết module Sự cố); vật tư; tỷ lệ nộp đúng hạn, số lần mở khóa, số yêu cầu sửa.

---

## 7. Thiết kế dữ liệu

Module `Modules/WorkReports`. Bảng do EF tạo, schema `dbo`, tên bảng số ít, cấu hình Fluent API trong `Data/Configurations/`.

### 7.1 GĐ 1 – Cấu hình, đơn vị, phân công, tuần (migration `AddWorkReportsFoundation`)

**`WorkCategory`** — đầu mục: `Code` (unique, vd `BT-LV1`), `GroupLetter`, `Name`, `CodeSuffix` (unique, viết hoa), `SortOrder`, `ShowInSummary`, `IsActive`.
**`WorkCategoryWorkshop`** — `WorkCategoryId`, `WorkshopId` (khóa ghép, xóa cứng); không có dòng = áp dụng mọi xưởng.
**`MaterialPurpose`** — `Code` (unique), `Name`, `SortOrder`, `IsActive`.
**`WorkReportSetting`** — 1 dòng: `HcMinutesPerWeek` (2700), `ShiftMinutesPerWeek` (2467.44), `DeadlineDayOffset` (số ngày kể từ T2 của tuần tới ngày hạn; **7 = T2 tuần sau**, 5 = T7 cùng tuần), `DeadlineTime` (11:00), `WarnDaysBefore` (2).
Hạn báo cáo tuần N = T2(N) + offset; hạn kế hoạch tuần N = T2(N) + offset − 7 (= hạn báo cáo tuần N−1).

**`WorkReportUnit`** — `OrgUnitId` (GROUP/SHIFT, unique khi chưa xóa), `DisplayName`, `CodePrefix` (unique trong xưởng), `LaborType` (`HC`/`KIP`), `SortOrder`, `IsActive`. Xưởng **không lưu cứng**, tính từ cây tổ chức.
**`WorkReportUnitEngineer`** — `WorkReportUnitId`, `EmployeeId`, `StartDate`, `EndDate` (null = đang phụ trách).
**`WorkWeek`** — `IsoYear`, `IsoWeek` (unique), `StartDate` (T2), `EndDate` (CN), `LabelMonth`, `LabelYear`, `PlanDeadlineAt`, `ReportDeadlineAt`, `IsDeadlineCustomized`.
**`WorkWeekDeadlineOverride`** — hạn riêng **1 xưởng**: `WorkWeekId`, `WorkshopId` (unique cặp), `PlanDeadlineAt?`, `ReportDeadlineAt?` (null = theo hạn chung).

### 7.2 GĐ 2 – Form, dòng, người, vật tư (migration `AddWorkReportsForms`)

**`WeeklyForm`** (BaseEntity) — `WorkReportUnitId`, `WorkWeekId` (unique cặp, lọc IsDeleted); **chụp**: `WorkshopId`, `UnitName`, `CodePrefix`, `LaborType`, `CapacityMinutes`, `EngineerNames`; GĐ 3: `PlanLockedAt`, `ReportLockedAt`, `PlanUnlockedUntil`, `ReportUnlockedUntil`.
Thông tin chụp cập nhật theo hiện tại **khi báo cáo chưa khóa**, cố định khi đã khóa; `CodePrefix` chỉ cập nhật khi form chưa cấp mã nào.
Trạng thái giai đoạn **tính khi đọc/ghi** (`WeeklyFormRules`): mở nếu `now ≤ hạn hiệu lực` (hạn riêng xưởng → hạn chung) hoặc `now ≤ UnlockedUntil`; báo cáo chưa tới 00:00 T2 của tuần = `NOT_STARTED`.

**`WorkItem`** (BaseEntity) — `WeeklyFormId`, `WorkCategoryId`, `Code` (50), `CodeSeq`, `EquipmentId?`, `EquipmentCode` (50), `EquipmentName` (255), `Description` (1000, bắt buộc), `WorkDate` (date, bắt buộc), `PlannedMinutes` decimal(10,2)?, `ActualMinutes` decimal(10,2)?, `ResultPercent` decimal(5,2)?, `WorkPermit` (20: Có/Không), `FiveS` (255), `Explanation` (1000), `Note` (500), `IsUnplanned`, `SortOrder`, `RowVersion` (rowversion).
Không lưu: Số người (đếm), Chênh lệch (tính), Tuần (từ kỳ tuần).

**`WorkItemWorker`** (không BaseEntity, xóa cứng, cascade theo dòng) — `WorkItemId`, `EmployeeId?` (null = tên tự do), `DisplayName` (100), `SortOrder`.

**`WorkMaterial`** (BaseEntity) — `WeeklyFormId` (lưu thêm để lọc nhanh), `WorkItemId` (bắt buộc), `MaterialCode` (50)?, `MaterialName` (255), `Uom` (20), `PlannedQuantity` / `ActualQuantity` decimal(18,3)?, `UsageDate`?, `MaterialPurposeId`?, `Note` (500), `IsUnplanned`.

**`WorkItemCodeCounter`** (không BaseEntity, không FK) — khóa (`WeeklyFormId`, `WorkCategoryId`), `LastSeq`. Lấy số: `UPDLOCK, HOLDLOCK` trong `ExecuteInTransactionAsync`.

> **Từ 16/11/2026** `WorkItem`, `WorkItemWorker`, `WorkMaterial` được thay bằng 2 bộ bảng riêng cho kế hoạch / báo cáo, `WorkDate` thành `StartDate` + `EndDate` — xem mục 16.2.

### 7.3 GĐ 3 (đã chừa chỗ)
`WorkItemHistory` (ai, lúc nào, dòng/cột, cũ → mới), thông báo trên web. ~~`RevisionRequest`~~ (bỏ yêu cầu chỉnh sửa 16/11/2026).

---

## 8. Quy tắc nghiệp vụ trong Service

- **Sinh mã**: bộ đếm `WorkItemCodeCounter` đọc bằng `UPDLOCK, HOLDLOCK` trong `ExecuteInTransactionAsync`; số đã cấp không dùng lại.
- **Theo giai đoạn** (từ 16/11/2026 mỗi giai đoạn có API và bảng riêng — mục 16):
  - Kế hoạch: thêm/sửa/xóa tự do trong hạn kế hoạch; nhận (3)(5)(6)(7)(9)(11)(18); (11) bắt buộc.
  - Báo cáo: thêm/sửa/xóa tự do trong từng đầu mục khi báo cáo mở; nhận (5)(6)(7)(9)(12)(14)–(18); việc phát sinh (không từ kế hoạch) bắt buộc (12). Dòng đưa vào từ kế hoạch giữ mã, đầu mục, (11).
- **Kiểm tra**: đầu mục đang dùng + áp dụng cho xưởng của form (chỉ kiểm khi thêm/đổi); ngày bắt đầu, ngày kết thúc trong T2–CN, kết thúc ≥ bắt đầu (trống = bằng bắt đầu); phút 0–504.000; kết quả 0–100; GPLV ∈ {Có, Không, trống} (nhận "co", "x", "Đã có GPLV", "ko", "chưa có"…); người thực hiện ≤ 50, nhân viên chọn phải tồn tại.
- **Thiết bị**: mã có trong danh mục → tự gắn `EquipmentId` (tên trống thì lấy tên danh mục); không có → gõ tự do.
- **Phạm vi**: `WorkReportScopeService` (mục 5). Thêm / sửa / xóa được ngay = có quyền tương ứng của giai đoạn (`Access.Plan` / `Access.Report`) **và** giai đoạn đang mở (trong hạn hoặc admin đã mở khóa).
- **Cạnh tranh ghi**: sửa dòng phải gửi `rowVersion`; lệch → **409** kèm dòng mới nhất trong `data`. Mọi lần sửa đều ghi dòng cha nên rowVersion tăng cả khi chỉ đổi người thực hiện.
- **Xóa dòng**: xóa mềm dòng + vật tư gắn với dòng.

---

## 9. API (GĐ 1–2)

**Cấu hình** (`work-reports.configure`)
- `GET/POST/PUT /api/work-categories` (kèm `workshopIds`), `PATCH /api/work-categories/{id}/active`
- `GET/PUT /api/work-report-settings`
- `GET/POST/PUT /api/work-report-units?workshopId=`, `PUT /api/work-report-units/reorder`, `DELETE /api/work-report-units/{id}`, `GET /api/work-report-units/deleted?workshopId=`, `POST /api/work-report-units/{id}/restore`, `GET /api/work-report-units/parent-options?workshopId=`
- `GET /api/work-weeks?year=`, `PUT /api/work-weeks/{id}/deadline` (tùy chọn `workshopId`)

**Phân công kỹ sư** (theo phạm vi đội/xưởng)
- `GET /api/work-report-units/{id}/engineers`, `PUT /api/work-report-units/{id}/engineers` (lưu cả danh sách)
- `GET /api/work-report-units/{id}/engineer-suggestions`

**Form & lưới** — xem bảng chi tiết mục 16.3 (thay mục 13.3 từ 16/11/2026).

---

## 10. Lộ trình

| GĐ | Nội dung | Kết quả |
|---|---|---|
| 1 – Nền tảng | Đầu mục (kèm xưởng áp dụng), cấu hình, đơn vị báo cáo + tiền tố, phân công kỹ sư, kỳ tuần, scope, mã quyền | Cấu hình được tổ/kíp, kỹ sư phụ trách |
| 2 – Form nhập | Lưới dùng chung, mã CV tự sinh, người thực hiện (chọn/gõ), vật tư, lưu theo dòng, dán Excel, tổng hợp, xuất Excel (cuối) | Bỏ file Excel, nhập trên web |
| 3 – Quy trình | Cảnh báo T7/CN trên web, ghi thời điểm khóa, mở khóa, yêu cầu sửa, lịch sử thay đổi | Đủ vòng tuần |
| 4 – Cộng tác | SignalR theo form, hiện ai đang sửa dòng nào, xử lý xung đột | Nhiều kỹ sư kíp cùng nhập |
| 5 – Xưởng & nhà máy | Trang nhà máy, dashboard từng xưởng, lưới chỉ đọc | BGĐ xem trực tiếp |

Gợi ý: chạy thử một xưởng song song với Excel 2 tuần trước khi áp dụng toàn nhà máy. FE làm sau (cần source Client để chọn thư viện lưới, kiểm tra giấy phép).

---

## 11. Câu hỏi còn mở

- Xuất Excel: cần **file mẫu chính thức** (đã chốt dạng: nhiều sheet theo tổ + Tổng hợp + Vật tư, như X.CĐNĐ1).

Đã giải đáp:
- ~~Kíp có tự đồng bộ kỹ sư từ sơ đồ không?~~ → **Không.** Vẫn cần **quản đốc xác nhận** (14/11/2026).
- ~~7.9 TIEP_TUC (dán Excel, mẫu xuất, vật tư kế hoạch, ô Equipment) + báo cáo mở khi nào, ảnh chụp form, nút Nộp, cú pháp `8h`~~ → theo đề xuất (15/11/2026), chi tiết mục 13.4.

---

## 12. GĐ 1 – Đã triển khai (BE)

### 12.1 Cách chạy
1. Migration `AddWorkReportsFoundation` (8 bảng) **đã có trong repo** → máy mới chỉ cần `dotnet ef database update`.
2. **Phải update database trước khi chạy Server**: `WorkReportSeeder` chạy lúc khởi động, thiếu bảng sẽ lỗi.
3. Khởi động: seeder thêm 2 mã quyền `work-reports.*`, 9 đầu mục A→I, 8 mục đích vật tư, 1 dòng cấu hình; sau 15 giây tác vụ nền tạo kỳ tuần (tuần trước → 2 tuần tới) và form tuần.
4. Gán quyền theo role (mục 5): `submit` → Kỹ sư, `manage` → Quản đốc / đội trưởng, `configure` → quản trị (Ban Giám đốc xem trang công khai, không cần quyền).
5. Kịch bản test GĐ 1 trên Swagger: `Docs/TEST_GD1_BAO_CAO_TUAN.md` (file ở máy đã tạo GĐ 1 — **chưa có trong repo**, cần commit).
6. Trang FE chưa có → chưa seed Page; khi làm FE tạo trang trên giao diện quản lý trang hoặc viết script SQL như `Data/Scripts/AddEquipmentAdminPage.sql`.

### 12.2 File
- **Mới** `Modules/WorkReports/`: `Entities`, `DTOs`, `Validators`, `Repositories` (+ `Interfaces`), `Services` (+ `Interfaces`; gồm `OrgTree`, `OrgTreeProvider`, `WorkWeekCalculator`, `WorkReportScope(Service)`, `WorkWeekGeneratorService`), `Controllers`, `WorkReportsModule.cs`.
- **Mới** `Data/Configurations/` 8 file; `Data/Seeders/WorkReportSeeder.cs`.
- **Sửa** `Data/Seeders/SeederExtensions.cs`, `Data/Seeders/IdentitySeedData.cs` + `Shared/Constants/PermissionCodes.cs` (2 mã quyền), `Api/Extensions/ServiceCollectionExtensions.cs`, `CLAUDE.md`.
- **Sửa (chỉ thêm hàm đọc)** Organization: `CurrentAssignmentDto` thêm `UnitRole`, `OrgUnitTypeCode`; `UnitMemberSummaryDto`; `IAssignmentService.GetUnitMembersAsync`. Employees: `EmployeeBriefDto`; `IEmployeeService.GetBriefsAsync`, `GetCurrentEmployeeIdAsync`.

### 12.3 API đã có
| API | Quyền |
|---|---|
| `GET /api/work-categories?includeInactive=&workshopId=`, `GET /{id}` | đăng nhập |
| `POST /api/work-categories`, `PUT /{id}`, `PATCH /{id}/active` | `work-reports.configure` |
| `GET /api/material-purposes?includeInactive=` | đăng nhập |
| `POST /api/material-purposes`, `PUT /{id}`, `PATCH /{id}/active` | `work-reports.configure` |
| `GET /api/work-report-settings` | đăng nhập |
| `PUT /api/work-report-settings` (`deadlineTime` dạng `"11:00:00"`) | `work-reports.configure` |
| `GET /api/work-report-units?workshopId=&includeInactive=`, `GET /{id}` | đăng nhập (kèm cờ `canConfigure`, `canManageEngineers`) |
| `GET /api/work-report-units/deleted?workshopId=`, `GET parent-options?workshopId=`, `DELETE /{id}`, `POST /{id}/restore` | admin / quản đốc-phó xưởng |
| `POST /api/work-report-units`, `PUT /{id}`, `PUT /reorder` | admin / quản đốc-phó xưởng |
| `GET /api/work-report-units/{id}/engineers` | xem được đơn vị |
| `PUT /api/work-report-units/{id}/engineers`, `GET /{id}/engineer-suggestions` | tổ HC: admin, quản đốc-phó, đội trưởng-phó; kíp: admin, quản đốc-phó |
| `GET /api/work-weeks?year=&workshopId=`, `GET /current?workshopId=`, `GET /{id}?workshopId=` | đăng nhập |
| `PUT /api/work-weeks/{id}/deadline` | `work-reports.configure` |
| `GET /api/work-reports/my-scope` | đăng nhập |

### 12.4 Quyết định khi code (bổ sung so với thiết kế)
- Hạn cấu hình bằng **số ngày kể từ T2** (`DeadlineDayOffset`) thay cho "thứ trong tuần", để tính được cả hạn trong tuần lẫn tuần sau.
- `GET /api/work-weeks/current` trả **tuần đang nhập báo cáo** và **tuần đang lập kế hoạch**: sáng thứ 2 trước 11:00 báo cáo vẫn là tuần trước.
- Trưởng/phó của **đơn vị cấp 1** được coi là quản đốc (gồm đội trưởng của đội trực thuộc Nhà máy); trưởng/phó **Nhà máy** tự xem được mọi xưởng.
- Admin (`configure`) **không nhập/sửa dữ liệu** form, chỉ cấu hình, mở khóa, phân công (đúng bảng phân quyền mục 5).
- Bỏ kỹ sư khỏi danh sách phụ trách: kết thúc vào hôm qua (mất quyền ngay hôm nay); nếu mới thêm trong hôm nay thì xóa luôn.
- Gợi ý kỹ sư = người cấp `KS` ở chính tổ/kíp, đơn vị cha và đội chứa tổ. Gợi ý tiền tố: bỏ dấu, bỏ "Tổ/Kíp/Nhóm/theo ca/Đội", nhiều từ thì lấy chữ cái đầu, kíp thêm ca.
- Đổi cấu hình hạn mặc định: tính lại các hạn **chưa tới** của tuần **chưa chỉnh tay**; hạn đã qua giữ nguyên.

### 12.5 Rà soát & sửa GĐ 1 (15/11/2026)
- **Bật lại đơn vị** (`PUT /work-report-units/{id}`, `isActive: true`) bị chặn khi tổ/kíp đã ngừng trên sơ đồ.
- `GET /work-report-units/deleted|parent-options?workshopId=` báo 404 nếu Id không phải xưởng (đơn vị cấp 1).
- **Sửa hạn tuần**: chặn hạn kế hoạch sau hạn báo cáo của cùng tuần (tính theo hạn riêng xưởng nếu sửa hạn riêng).
- Thêm / sửa / bật / ngừng đơn vị, đổi kỹ sư phụ trách, đổi cấu hình → **đồng bộ form ngay** (tạo form, cập nhật tên/KTV/giờ công hiệu dụng của form chưa khóa).
- Scope: quyền trên form tính theo xưởng đã chụp trong form (overload `GetUnitAccessAsync(unit, workshopId)`).
- Sửa chú thích sai "kết thúc từ hôm nay" → "mất quyền ngay hôm nay"; gom hàm bỏ dấu vào `TextNormalizer`.
- Hạ tầng chung: thêm `ConflictException` (`Shared/Exceptions`) → middleware trả **409** kèm `data` (dữ liệu mới nhất).

---

## 13. GĐ 2 – Đã triển khai (BE, trừ xuất Excel)

### 13.1 Cách chạy
1. `dotnet ef database update` (migration `AddWorkReportsForms`: 5 bảng mới, không đụng bảng cũ).
2. Có ít nhất 1 đơn vị báo cáo + kỹ sư phụ trách (GĐ 1). Form tự tạo khi: thêm/bật đơn vị, mở lưới tuần đang làm việc, hoặc tác vụ nền (15 giây sau khởi động, 6 giờ/lần).
3. Kịch bản test Swagger: `Docs/HUONG_DAN_TEST_BAO_CAO_TUAN.md` (trọn luồng GĐ 1 → GĐ 2, kèm vai trò từng API) hoặc `Docs/TEST_GD2_BAO_CAO_TUAN.md` (chỉ GĐ 2).

### 13.2 File
- **Mới** Entities: `WeeklyForm` (+ `WorkReportPhases`, `FormPhaseStatuses`), `WorkItem` (+ `WorkPermitValues`), `WorkItemWorker`, `WorkMaterial`, `WorkItemCodeCounter`.
- **Mới** DTOs: `WeeklyFormDto` (lưới, tổng hợp, request lưới), `WorkItemDto` (dòng, người, dán Excel, gợi ý người), `WorkMaterialDto`.
- **Mới** Validators: `WorkItemRequestValidator`, `WorkMaterialRequestValidator`.
- **Mới** Repositories: `WeeklyFormRepository`, `WorkItemRepository` (bộ đếm mã UPDLOCK, rowVersion), `WorkMaterialRepository`.
- **Mới** Services: `WeeklyFormService` (đồng bộ form, quyền + trạng thái, lưới, tổng hợp), `WorkItemService` (thêm/sửa/xóa, dán Excel, gợi ý người), `WorkMaterialService`, `WeeklyFormRules` (mở/khóa, mã, La Mã, tiêu đề), `WeeklyFormContext`, `WorkItemMapper`, `WorkItemInputParser` (đọc ô Excel), `TextNormalizer`.
- **Mới** `Data/Configurations/` 5 file; migration `AddWorkReportsForms`.
- **Sửa** `WorkReportsController` (API mục 13.3), `WorkWeekGeneratorService` (đồng bộ form), `WorkReportsModule`, các service GĐ 1 (mục 12.5).
- **Sửa (chỉ thêm hàm đọc)** Equipments: `IEquipmentService.GetByCodesAsync` (+ repository).

### 13.3 API (prefix `/api/work-reports`, chỉ cần đăng nhập; phạm vi + khóa kiểm tra trong Service)

> **Đã thay bằng mục 16.3 (16/11/2026)**: API tách `/plan/*` và `/report/*`, bỏ `?phase=` và `items/batch` (dán Excel). Bảng dưới giữ để tham khảo lịch sử.

| API | Mô tả |
|---|---|
| `GET grid?workshopId=&weekId=&phase=&unitId=` | Bảng công việc: đầu mục dùng được, các form xem được (thứ tự I, II…, trạng thái, hạn, `canEditNow`, tổng phút), dòng theo đầu mục + TT. Tuần đang làm việc tự tạo form còn thiếu |
| `GET summary?workshopId=&weekId=&phase=` | Tổng hợp: mỗi đơn vị 1 dòng + dòng tổng |
| `GET materials?workshopId=&weekId=&phase=` | Vật tư cả xưởng |
| `GET worker-options?unitId=&scope=UNIT\|TEAM\|WORKSHOP&keyword=` | Gợi ý người thực hiện (người của chính tổ/kíp xếp trước) |
| `POST forms/{formId}/items?phase=` | Thêm dòng (PLAN: dòng kế hoạch; REPORT: dòng phát sinh) |
| `POST forms/{formId}/items/batch?phase=` | Dán Excel: `{ rows: [{ rowIndex, category, workDate, workers, plannedMinutes… }] }` → `{ created, errors }` |
| `PUT items/{id}?phase=` | Sửa dòng (body có `rowVersion`); lệch → 409 + dòng mới nhất |
| `DELETE items/{id}?phase=` | Xóa dòng (+ vật tư của dòng) |
| `GET forms/{formId}/materials?phase=` | Vật tư của form |
| `POST forms/{formId}/materials?phase=`, `PUT materials/{id}?phase=`, `DELETE materials/{id}?phase=` | Thêm/sửa/xóa vật tư |

Lỗi: không quyền nhập → 403; form chưa tới tuần / đã khóa → 400 với thông báo hạn; dữ liệu sai → 400 kèm `errors` theo trường camelCase.

### 13.4 Quyết định đã chốt (15/11/2026, theo đề xuất)
1. **Dán Excel**: lưu dòng hợp lệ, trả lỗi từng ô của dòng sai (FE giữ dòng sai, tô đỏ).
2. **Xuất Excel**: nhiều sheet theo tổ + Tổng hợp + Vật tư (như X.CĐNĐ1) — làm **bước cuối**, cần file mẫu.
3. **Vật tư ở kế hoạch**: có (số lượng KH); báo cáo nhập thực tế + vật tư phát sinh.
4. **Equipment**: cho gõ tự do; mã có trong danh mục tự gắn `EquipmentId`.
5. **Báo cáo tuần W mở từ 00:00 T2 tuần W.**
6. **Thông tin chụp** (xưởng, tên, KTV, loại giờ công, giờ công hiệu dụng) cập nhật khi form chưa khóa báo cáo, cố định khi khóa; tiền tố chỉ đổi khi form chưa cấp mã.
7. **Không có nút Nộp** ở GĐ 2; trạng thái Chưa tới / Đang nhập / Đã khóa.
8. **Ô phút**: API thường nhận số phút; dán Excel hiểu `8h`, `1,5h`, `30p`, số có dấu nghìn.

Bổ sung khi code:
- Ngày, hạng mục bắt buộc mọi dòng; giờ công KH bắt buộc ở kế hoạch; giờ công thực tế bắt buộc với dòng phát sinh.
- Trường không thuộc giai đoạn bị bỏ qua (FE gửi cả dòng không lỗi).
- Đọc ô dán Excel: đầu mục khớp giá trị dropdown / tên / hậu tố (bỏ dấu, không phân biệt hoa thường); ngày nhận `dd/MM/yyyy`, `d/M` (năm theo tuần), `yyyy-MM-dd`, số ngày Excel, chuỗi có ngày (lấy ngày đầu: ca đêm tính ngày bắt đầu); người thực hiện tách theo `, ; + xuống dòng`, khớp mã NV hoặc họ tên duy nhất trong xưởng (ưu tiên người của tổ/kíp), trùng tên → tên tự do; kết quả % nhận "100%", "100", 0–1 không dấu % thì × 100. Tối đa 1.000 dòng/lần.
- Đơn vị ngừng dùng: form **trống** tuần chưa bắt đầu bị bỏ; form có dữ liệu giữ.
- Tạo form tự động chỉ cho tuần trước (khi báo cáo chưa khóa), tuần này, tuần sau; tuần cũ hơn không tạo bù.
- Số đầu mã vật tư: đếm mã khác nhau, vật tư không mã đếm theo tên. Tổng phút Tổng hợp = mọi dòng (kể cả đầu mục không hiện cột). Nhân lực quy đổi dòng tổng = cộng các dòng.
- Vật tư không có rowVersion (ghi sau thắng); dòng công việc có.
- Kiểm thử: đã chạy test tích hợp trên DB thật trong transaction rồi rollback (mã không dùng lại, đổi đầu mục, 409, rowVersion khi đổi người, khóa kế hoạch, dòng phát sinh, dán Excel, vật tư, lưới, tổng hợp, ngừng đơn vị).

### 13.5 Còn lại của GĐ 2
- `GET /api/work-reports/export?workshopId=&weekId=&phase=` (ClosedXML) — chờ file mẫu.

---

## 15. FE (Client) GĐ 1–2

### 15.1 Trang & cách bật menu
| Route | Area | Quyền | Nội dung |
|---|---|---|---|
| `/member/work-reports` "Báo cáo công việc tuần" | MEMBER | `work-reports.submit` | Kỹ sư: chọn xưởng, giai đoạn (Báo cáo tuần / Kế hoạch tuần), tuần (◀ ▶, năm, "Tuần hiện tại"). Tab **Bảng công việc**, **Tổng hợp**, **Vật tư xưởng** |
| `/admin/work-reports` "Báo cáo tuần › Quản lý báo cáo tuần" | ADMIN | `work-reports.manage` | Đội trưởng, quản đốc: như trên + tab **Đơn vị & kỹ sư** (tổ/kíp theo sơ đồ tự có; thêm đơn vị tự đặt, sửa tên / tiền tố / HC-KIP / ngừng dùng, xóa + mục "Đã xóa" để khôi phục, thứ tự, phân công kỹ sư). Thêm/sửa/xóa dòng chỉ khi admin cấp `plan.*` / `report.*`. Admin thấy nút **Mở khóa** trên dòng tổ/kíp đã khóa |
| `/admin/work-report-settings` "Báo cáo tuần › Cấu hình báo cáo tuần" | ADMIN | `work-reports.configure` | Tab Cấu hình chung, Đầu mục công việc, Mục đích vật tư, Hạn nộp theo tuần (hạn chung / riêng xưởng) |
| `/work-reports` "Báo cáo nhà máy › Báo cáo tuần" | PUBLIC (toàn màn hình) | không cần (kể cả chưa đăng nhập) | Ban Giám đốc xem mọi xưởng, chỉ xem: Bảng công việc, Tổng hợp, Vật tư xưởng, vật tư từng tổ |

Trang công khai đọc qua `PublicWorkReportsController` (`[AllowAnonymous]`, chỉ GET: `scope`, `weeks`, `weeks/current`, `grid`, `summary`, `materials`, `forms/{id}/materials`); mỗi action gọi `IWorkReportScopeService.UsePublicView()` → phạm vi = xem mọi xưởng, `canEditNow = false`, không phụ thuộc người đăng nhập. FE bọc trang trong `WorkReportPublicContext` để các hook đọc gọi API public.

Bật trang + menu trên DB đang dùng: khởi động Server bản mới 1 lần (seeder thêm 3 quyền) → `sqlcmd -S <server> -d NM_CD2 -I -f 65001 -i Data/Scripts/AddWorkReportPages.sql` (chạy lặp lại an toàn; gắn quyền cho trang member cũ, đưa trang cấu hình vào nhóm) → gán quyền cho role ở **Vai trò / Phân quyền**. DB mới: seeder tạo sẵn các trang.

### 15.2 Bảng công việc
- **Từ 16/11/2026 tách 2 bảng** `PlanGridTable` / `ReportGridTable` (mục 16.4); mô tả dưới vẫn đúng phần giao diện chung.
- **1 bảng cho cả xưởng, giống sheet Excel**: tiêu đề "BÁO CÁO/KẾ HOẠCH CÔNG VIỆC - <xưởng> / Tuần…", cột (1)…(18) theo file cũ + Tổ thực hiện, KTV phụ trách, Tuần; nhóm tiêu đề "Nhân sự thực hiện (Người)", "Giờ công thực hiện (phút)". Dùng **AntD Table**: **bảng có thanh cuộn riêng** (ngang + dọc, cao = phần màn hình còn lại, tối thiểu 420px), tiêu đề cột đứng yên (nền đặc); chữ dài xuống dòng như Wrap text. Cột nhỏ thứ 2 (không cố định) có nút sửa / xóa dòng, lưu / hủy khi đang sửa. Cột TT không đặt `align` để ô gộp của dòng tiêu đề căn trái.
- Dòng tổ/kíp (I, II…, nền vàng): trạng thái (Đang nhập / Đã khóa / Chưa tới tuần), hạn, số dòng, tổng phút, vai trò; nút **Vật tư** (luôn thấy khi cuộn ngang). Chữ bảng 12px, viền ô đậm (giống lưới Excel).
- Dòng đầu mục (A, B…, nền xanh) có nút "+ Thêm dòng" **chỉ ở giai đoạn kế hoạch**; báo cáo không thêm việc phát sinh trên bảng (người dùng bỏ 15/11/2026; API vẫn hỗ trợ). Đầu mục trống chỉ hiện khi đang lập kế hoạch. Lọc tổ/kíp ở ô chọn phía trên bảng.
- Sửa tại chỗ từng dòng: double-click hoặc nút bút; **Enter lưu (ô 1 dòng), Esc hủy, Tab chuyển ô**; hạng mục / diễn giải / ghi chú là ô nhiều dòng; ô giờ công nhận "8h" (= số người × 8 × 60, hiện gợi ý "= 8 giờ"); người thực hiện chọn nhân viên (gợi ý tổ/kíp → đội → xưởng) hoặc gõ tên + Enter; Equipment gõ để tìm trong danh mục hoặc gõ tự do.
- 409: báo "người khác vừa sửa", bỏ bản đang sửa, tải lại dòng mới nhất. Lỗi kiểm tra gắn vào từng ô.
- **Dán Excel**: đã gỡ hẳn (16/11/2026) cả `PasteItemsModal` lẫn API `items/batch`.
- **Vật tư**: tab Vật tư xưởng, thêm/sửa/xóa vật tư gắn mã công việc của giai đoạn đang xem; kế hoạch nhập SL KH, báo cáo nhập SL thực tế (vật tư chép từ kế hoạch: trống = KH).

### 15.3 Quyết định FE
- Bảng công việc dùng **AntD Table** (không thêm thư viện lưới). Đã thử react-data-grid (15/11/2026) nhưng người dùng thấy giao diện không đẹp → gỡ, quay về AntD Table. Không cố định cột (dòng tiêu đề tổ/đầu mục gộp ngang qua mọi cột); nội dung dòng tiêu đề dùng `sticky` để luôn thấy khi cuộn ngang.
- `ApiError` (shared) thêm `data` để đọc dòng mới nhất khi 409.
- 3 trang dùng chung `components/WorkReportWorkspace` (`mode` = `submit` / `manage` / `factory`); lưới tự chỉ xem khi `canEditNow = false`.
- Đơn vị & kỹ sư cấu hình theo xưởng trong trang Quản lý báo cáo tuần (quản đốc không cần quyền `configure`).

## 16. Tách kế hoạch / báo cáo, quyền thêm/sửa/xóa, mở khóa (16/11/2026)

### 16.1 Nghiệp vụ (người dùng chốt 16/11/2026)
- **Kế hoạch và báo cáo là 2 bảng, 2 API riêng**; thêm/sửa/xóa cũng tách riêng từng giai đoạn.
- **Kế hoạch**: thêm/sửa/xóa tùy ý trong hạn kế hoạch. Quá hạn → khóa, **chỉ admin mở khóa** (mở tới 1 thời điểm, tối đa 30 ngày, có thể khóa lại).
- **Báo cáo**: thêm/sửa/xóa tự do trong từng đầu mục khi báo cáo đang mở (00:00 T2 → hạn báo cáo); quá hạn → khóa, chỉ admin mở khóa.
- **Gợi ý từ kế hoạch**: dòng kế hoạch chưa đưa vào báo cáo hiện mờ trong bảng báo cáo, **chỉ người đang thêm được dòng báo cáo thấy** (kỹ sư phụ trách / người được cấp `report.create`); trang xem (admin, công khai) không thấy. Bấm "Đưa vào" (hoặc "Đưa tất cả kế hoạch vào báo cáo") → chép thành dòng báo cáo: giữ mã công việc, đầu mục, giờ KH, ngày, người, ghi chú, vật tư kế hoạch (SL KH). Xóa dòng báo cáo đó → kế hoạch lại thành gợi ý.
- **Hiển thị ở trang xem**: dòng báo cáo lưu xong là thấy ngay (người dùng chọn "Hiện ngay từng dòng"); hết hạn thì toàn bộ báo cáo đã nhập vẫn hiện, gợi ý không hiện.
- **Dòng thêm ở báo cáo** (việc phát sinh): người nhập **tự điền giờ công kế hoạch (11)** (bắt buộc); giờ thực tế (12) trống = bằng KH. Dòng từ kế hoạch giữ giờ KH, không sửa (bổ sung 16/11/2026). Ô giờ công bỏ dòng gợi ý "≈ … giờ".
- **Thời gian thực hiện (7)**: ngày bắt đầu + ngày kết thúc (cả kế hoạch và báo cáo), trong tuần, kết thúc ≥ bắt đầu. Cùng ngày → hiện 1 ngày; khác ngày → hiện "dd/MM – dd/MM/yyyy".
- **Quyền**: xem mục 5. Bỏ "quản đốc sửa khi khóa" và **bỏ yêu cầu chỉnh sửa**.
- **Vật tư**: tách theo 2 bảng (vật tư kế hoạch gắn dòng kế hoạch; vật tư báo cáo gắn dòng báo cáo).

### 16.2 Dữ liệu (migration `SplitWorkPlanReport`)
- Lớp chung (không phải bảng): `WorkItemBase<TWorker>` — `WeeklyFormId`, `WorkCategoryId`, `Code`, `CodeSeq`, `EquipmentId?`, `EquipmentCode`, `EquipmentName`, `Description`, **`StartDate`, `EndDate`**, `Note`, `SortOrder`, `RowVersion`, `Workers`; `WorkItemWorkerBase`; `WorkMaterialBase`.
- **`WorkPlanItem`** (+ `PlannedMinutes`) / **`WorkPlanItemWorker`** / **`WorkPlanMaterial`** (`WorkPlanItemId`, `Quantity`).
- **`WorkReportItem`** (+ `PlanItemId?` — null = việc phát sinh, unique lọc `IsDeleted = 0`; `PlannedMinutes` chụp từ kế hoạch; `ActualMinutes`, `ResultPercent`, `WorkPermit`, `FiveS`, `Explanation`) / **`WorkReportItemWorker`** / **`WorkReportMaterial`** (`WorkReportItemId`, `PlanMaterialId?`, `PlannedQuantity?`, `ActualQuantity?`).
- `WorkItemCodeCounter` giữ nguyên, dùng chung 2 giai đoạn (mã kế hoạch và việc phát sinh không trùng nhau).
- Migration chép dữ liệu cũ: dòng không phát sinh → `WorkPlanItem` (giữ Id); dòng phát sinh + dòng kế hoạch đã nhập số liệu thực hiện → `WorkReportItem` (kèm người, vật tư); `WorkDate` → `StartDate = EndDate`; rồi xóa 3 bảng cũ. Down chỉ dựng lại cấu trúc cũ (không chép ngược).
- Chạy: `dotnet ef database update --configuration Release` (Server không tự migrate). Khởi động lại Server để seeder thêm 6 quyền mới.

### 16.3 API
Chung (`/api/work-reports`): `GET my-scope`, `GET worker-options`.

| Kế hoạch `/api/work-reports/plan` | Báo cáo `/api/work-reports/report` | Quyền (ngoài phạm vi trong Service) |
|---|---|---|
| `GET grid?workshopId=&weekId=&unitId=` | `GET grid?…` (form có `suggestions` cho người nhập) | đọc: mọi quyền `work-reports.*` |
| `GET summary`, `GET materials`, `GET forms/{formId}/materials` | như kế hoạch | đọc |
| `POST forms/{formId}/items` | `POST forms/{formId}/items` (việc phát sinh) | `submit` hoặc `plan.create` / `report.create` |
| — | `POST forms/{formId}/items/from-plan` `{ planItemIds }` | `submit` hoặc `report.create` |
| `PUT items/{id}` (có `rowVersion`, 409) | `PUT items/{id}` | `submit` hoặc `*.update` |
| `DELETE items/{id}` (+ vật tư) | `DELETE items/{id}` (+ vật tư) | `submit` hoặc `*.delete` |
| `POST/PUT/DELETE` vật tư: `forms/{formId}/materials`, `materials/{id}` | như kế hoạch | theo create/update/delete của giai đoạn |
| `POST forms/{formId}/unlock` `{ until }` (null = khóa lại) | như kế hoạch | `configure` |

Công khai (`[AllowAnonymous]`, chỉ GET): `/api/work-reports/public/{scope, weeks, weeks/current}`, `/public/plan/{grid, summary, materials, forms/{id}/materials}`, `/public/report/{…}`.
Form trong lưới trả `canCreate`, `canUpdate`, `canDelete` (đã tính mở/khóa), `canEditNow`, `canUnlock`, `isUnlocked`; bỏ `canEditLocked`, `canRequestRevision`. `WorkReportUnitAccessDto`: `plan` / `report` (`canCreate/canUpdate/canDelete`), bỏ `canEdit`, `canEditLocked`, `canRequestRevision`.

### 16.4 Code
- **BE**: Entities `WorkItemBase`, `WorkPlanItem`, `WorkReportItem`, `WorkMaterialBase`; cấu hình EF `Data/Configurations/WorkItemConfigurations.cs`; repo generic `WorkItemRepository<,>` (+ `WorkPlanItemRepository`, `WorkReportItemRepository`), `WorkMaterialRepository<>`; bộ đếm mã chuyển sang `WeeklyFormRepository.NextCodeSeqAsync`. Services: `WeeklyFormService` (form, quyền + trạng thái, mở khóa, khung lưới/tổng hợp dùng chung), `WorkPlanService`, `WorkReportService`, `WorkMaterialServiceBase` (+ `WorkPlanMaterialService`, `WorkReportMaterialService`), `WorkItemSupport` (chuẩn hóa, người, thiết bị, rowVersion), `WorkerOptionService`. Controllers `WorkPlanController`, `WorkReportItemsController`, `WorkReportsController` (chỉ còn phần chung), `PublicWorkReportsController`. Bỏ `WorkItemService`, `WorkMaterialService` cũ, `WorkItemInputParser` (dán Excel).
- **Quyền**: `PermissionCodes.WorkReports.PlanCreate/Update/Delete`, `ReportCreate/Update/Delete` (seeder thêm khi khởi động); `WorkReportScope` có `HeadTeamIds`, `HeadWorkshopIds`, `PlanRights`, `ReportRights`, `CanManage` (`ManagedTeamIds/ManagedWorkshopIds` = khi có `manage`).
- **FE**: `components/grid/` — `sheetGridShared.tsx` (dựng dòng, sửa tại chỗ, cột chung), `SheetGridHeaders.tsx` (dòng tổ/đầu mục), `PlanGridTable.tsx`, `ReportGridTable.tsx` (dòng gợi ý chữ nhạt + nút "Đưa vào", "Đưa tất cả…"), `FormUnlockButton.tsx` (admin), `GridRowActions.tsx`. `WorkGridView` chọn bảng theo `grid.phase`. API FE theo đường dẫn giai đoạn (`PHASE_PATH`). Bỏ `WorkGridTable`, `PasteItemsModal`, `FormMaterialsDrawer` (không dùng), hàm dán Excel.

### 16.5 Test tích hợp đã chạy (DB thật, transaction rồi rollback)
Chạy migration: số dòng chép khớp, bảng cũ đã xóa. Khóa kế hoạch chặn thêm; admin mở khóa → mở; mở khóa thời điểm đã qua → 400; ngày kết thúc < bắt đầu → 400; thêm KH 2 ngày / 1 ngày; vật tư KH; sửa + 409; không có quyền xóa → 403; gợi ý có dòng KH; không có `report.create` → không gợi ý; đưa vào báo cáo giữ mã + giờ KH + ngày + vật tư; đưa lại → 400; việc phát sinh thiếu giờ thực tế → 400; sửa dòng từ KH không đổi được đầu mục; tổng hợp; xóa dòng báo cáo → thành gợi ý, đưa lại được; xóa KH xóa vật tư KH, dòng báo cáo vẫn giữ; khóa lại; trang xem không gợi ý, không sửa.

## 17. Cập nhật tức thì (SignalR) — 16/11/2026

- Người dùng chốt: thêm gói npm `@microsoft/signalr` (^8.0.7, MIT, đóng gói cùng app); đẩy tức thì khi **lưu / xóa dòng (kế hoạch, báo cáo), đưa kế hoạch vào báo cáo, thêm/sửa/xóa vật tư, admin mở / khóa lại**. Chưa đẩy thay đổi cấu hình (đơn vị, kỹ sư, hạn, đầu mục).
- **Server**: hub `Modules/WorkReports/Hubs/WorkReportHub` tại `/api/hubs/work-reports` (`[AllowAnonymous]`, map ở `Api/Program.cs`). Client gọi `JoinWeek(workshopId, weekId)` / `LeaveWeek`; nhóm `ws:{xưởng}:week:{tuần}`. `IWorkReportNotifier.FormChangedAsync(form, phase)` gửi sự kiện `FormChanged` `{ workshopId, weekId, formId, phase }` sau khi lưu thành công (gọi trong `WorkPlanService`, `WorkReportService`, `WorkMaterialServiceBase`, `WeeklyFormService.UnlockAsync`); lỗi gửi chỉ ghi log.
- **Tin không chứa dữ liệu** → mỗi trang tự tải lại qua API của mình nên đúng quyền (trang xem không thấy gợi ý từ kế hoạch); vì vậy hub không cần đăng nhập, trang công khai `/work-reports` cũng nhận.
- `AuditLogMiddleware` bỏ qua `/api/hubs/*` (không ghi nhật ký, không bọc response của negotiate / long polling).
- **Client**: `hooks/useWorkReportLiveUpdates.ts` (gọi trong `WorkReportWorkspace`): 1 kết nối / trang, vào nhóm theo xưởng + tuần đang xem, nhận `FormChanged` → làm mới query nhóm `data` (lưới, Tổng hợp, Vật tư), gộp tin trong 300ms; tự nối lại (0s, 2s, 5s, 10s, rồi 30s/lần), nối lại xong vào lại nhóm và tải lại 1 lần. Không kết nối được thì trang vẫn dùng bình thường.
- Dòng đang sửa không bị mất khi dữ liệu tự làm mới; lưu vẫn gửi `rowVersion` lúc bắt đầu sửa → người khác vừa sửa cùng dòng thì 409 như cũ. Dòng đang sửa bị người khác xóa → thoát chế độ sửa.
- Vite proxy `/api` bật `ws: true`. **IIS**: bật Windows feature **WebSocket Protocol** (Server Manager → Web Server → Application Development); chưa bật thì SignalR tự dùng long polling (vẫn chạy, chậm hơn).
- Đã thử: Server bản mới, negotiate không cần đăng nhập, kết nối WebSocket, `JoinWeek` / `LeaveWeek` từ gói client.

## 18. Tách quyền phân công kỹ sư, mở khóa (17/11/2026)

- Người dùng chốt: `work-reports.manage` chỉ còn **xem đội/xưởng + cấu hình tổ/kíp**; **phân công kỹ sư** và **mở khóa** thành 2 quyền riêng, phạm vi **theo chức vụ** trên sơ đồ (giống 6 quyền thêm/sửa/xóa). Yêu cầu chỉnh sửa đã bỏ từ 16/11 (không còn code).
- `work-reports.assign-engineers`: quản đốc/phó → mọi tổ/kíp trong xưởng; đội trưởng/phó → tổ thuộc đội (kíp chỉ quản đốc/phó); có thêm `configure` → mọi xưởng. Được vào `api/work-report-units` (danh sách, kỹ sư); cấu hình đơn vị vẫn cần `configure` hoặc `manage` + quản đốc/phó.
- `work-reports.unlock`: mở khóa / khóa lại kế hoạch, báo cáo quá hạn (`POST /api/work-reports/{plan|report}/forms/{id}/unlock`); quản đốc/phó → mọi tổ/kíp trong xưởng; đội trưởng/phó → tổ thuộc đội; có thêm `configure` → mọi xưởng. **`configure` không còn tự có quyền mở khóa / phân công.**
- Chức vụ trưởng/phó được tính khi có 1 trong: `manage`, `assign-engineers`, `unlock`, 6 quyền thêm/sửa/xóa. Có `assign-engineers` / `unlock` trong phạm vi thì cũng xem được tổ/kíp đó.
- Code: `PermissionCodes.WorkReports.AssignEngineers` / `.Unlock`, seeder (sort 86, 94); `WorkReportScope.CanAssignEngineers` / `.CanUnlock`; `WorkReportScopeService.ComputeAccess` tính `CanManageEngineers`, `CanUnlock` (DTO giữ tên cũ, Client không đổi). Các API đọc nhận thêm 2 quyền mới.
- **Bật trên DB đang dùng**: khởi động Server bản mới 1 lần (seeder thêm 2 quyền) → chạy **1 lần** `Data/Scripts/SplitWorkReportManagePermissions.sql`: role có `manage` / `configure` được cấp `assign-engineers`, role có `configure` được cấp `unlock` (giữ nguyên chức năng đang dùng), đổi tên hiển thị `manage` / `configure`. Sau đó admin bỏ bớt trên trang Phân quyền nếu muốn tách người.
- Người chỉ có `assign-engineers` / `unlock` (không có `manage`) cần trang để thao tác: admin gán thêm `manage`, hoặc cho role đó vào trang `/admin/work-reports` (trang gắn 1 quyền `manage`).

## 19. Người thực hiện: "Cả tổ", bỏ gợi ý Đội/Xưởng (17/11/2026)

- Ô chọn người thực hiện (9): bỏ chế độ gợi ý **Đội / Xưởng**, chỉ gợi ý nhân viên của tổ/kíp. Ô đã chọn chỉ hiện **tên** (mã NV chỉ hiện mờ trong danh sách), hiện **đủ tên** (không gộp "+n").
- Dòng đầu danh sách **"Cả tổ"** (kèm số người): chọn thì bỏ người lẻ; chọn / gõ thêm người thì bỏ "Cả tổ". Số người (8) = số nhân viên tổ/kíp; giờ dạng "8h" nhân theo số này.
- Lưu: cột `IsWholeUnit` trên `WorkPlanItem`, `WorkReportItem` (migration `AddWorkItemIsWholeUnit`). Request gửi `isWholeUnit: true` (bỏ qua `workers`) → `WorkItemSupport.BuildWorkersAsync` lấy toàn bộ nhân viên tổ/kíp trên sơ đồ (`IWorkerOptionService.GetUnitMembersAsync`, cùng danh sách gợi ý) làm bản chụp `Workers`; tổ/kíp chưa có ai → 400. Mỗi lần lưu lại thì chụp lại theo sơ đồ lúc đó. Đưa kế hoạch vào báo cáo giữ cờ.
- Hiển thị: ô (9) ghi "Cả tổ", rê chuột xem danh sách tên; DTO có `isWholeUnit`.
- Client: giá trị ô là `all:<số người>` (`WHOLE_UNIT_PREFIX`, `countWorkerValues` trong `workReportUtils`).

## 20. Nhiều kỹ sư cùng nhập 1 tổ/kíp (17/11/2026)

Người dùng chốt làm A + B + C + D (bỏ E "cảnh báo trùng việc", để sau).

**A. Hiện "đang sửa" (khóa mềm, thời gian thực)**
- Kỹ sư bấm sửa / thêm dòng → trang khác thấy 🔒 ở cột TT (rê chuột: "X đang sửa dòng này"), nút sửa/xóa của dòng đổi thành 🔒; double-click báo "X đang sửa dòng này". Dòng tiêu đề tổ/kíp hiện "✎ Đang nhập: A, B" (gồm cả người đang thêm dòng mới).
- Chỉ là hiển thị + chặn nút trên giao diện; chốt chặn thật vẫn là rowVersion → 409.
- Server: `Hubs/WorkReportPresence.cs` — `WorkReportPresenceTracker` (singleton, trong bộ nhớ, mỗi kết nối tối đa 1 dòng), `WorkReportPresenceCleanupService` (30 giây/lần bỏ mục quá 90 giây không heartbeat). Hub thêm `StartEditing(workshopId, weekId, formId, phase, itemId?)`, `StopEditing()`, `Heartbeat()`; ngắt kết nối thì tự bỏ; sự kiện `PresenceChanged` `{ workshopId, weekId, editors[] }` gửi cho nhóm (xưởng, tuần), `JoinWeek` nhận ngay danh sách hiện tại.
- Báo "đang sửa" cần đăng nhập: Client gửi access token qua query `access_token` (chỉ nhận cho `/api/hubs/*`, `GatewayExtensions` `OnMessageReceived`); kết nối không đăng nhập (trang công khai) chỉ nhận.
- Chạy nhiều tiến trình / nhiều máy chủ thì khóa mềm không dùng chung (cần Redis backplane) — hiện 1 site IIS nên đủ.
- Client: `useWorkReportLiveUpdates` trả `{ editors, startEditing, stopEditing }`, `WorkReportPresenceContext` cấp trong `WorkReportWorkspace`; `useSheetEditor(forms, week, phase)` tự báo dòng đang sửa, `lockOf(formId, itemId)`, `editorNamesOf(formId)`; heartbeat 30 giây khi đang sửa; nối lại thì báo lại.

**B. Lưu bị từ chối (409) không mất dữ liệu**
- Dòng công việc và vật tư: hộp thoại "… vừa được người khác sửa" — ai sửa, lúc nào, bảng các ô khác nhau (Bản của bạn / Bản mới nhất). Nút: **Tiếp tục sửa** (đóng, giữ dữ liệu), **Dùng bản mới nhất** (bỏ bản của mình), **Ghi đè bằng bản của tôi** (lưu lại với rowVersion mới nhất).
- Client: `components/ConflictResolveModal.tsx`, `utils/conflictFields.ts`, `commonConflictFields` trong `sheetGridShared`. Server không đổi (409 vẫn trả bản mới nhất trong `data`), chỉ đổi câu thông báo.

**C. Vật tư chống ghi đè**
- Cột `RowVersion` (rowversion) cho `WorkPlanMaterial`, `WorkReportMaterial` (migration `AddWorkMaterialRowVersion`). `PUT …/materials/{id}` bắt buộc `rowVersion`; lệch → 409 kèm vật tư mới nhất. DTO vật tư có `rowVersion`.

**D. Người sửa cuối**
- DTO dòng và vật tư có `updatedByName` (họ tên từ `UpdatedBy` = mã NV, `IEmployeeService.GetBriefsByEmpCodesAsync`, `WorkItemSupport.FillUpdatedByNamesAsync`). Rê chuột ô Mã công việc / Mã vật tư: "Sửa lần cuối: Đỗ Cương · 17/11/2026 14:05".

## 21. KTV phụ trách theo từng dòng (17/11/2026)

- Cột (10) "KTV phụ trách" lưu **theo dòng** (trước: KTV của tổ/kíp, dòng nào cũng giống nhau). Dòng mới mặc định **người nhập**; chọn thêm KTV cùng làm trong danh sách **kỹ sư được phân công tổ/kíp** (người dùng chốt) + người nhập. Bỏ trống khi lưu = người nhập.
- Server: cột JSON `Engineers` (`[{"EmployeeId","FullName"}]`, bản chụp họ tên lúc lưu) trên `WorkPlanItem`, `WorkReportItem` — owned `ToJson()`, migration `AddWorkItemEngineers` (dòng cũ gán `[]`). Request `engineerIds`; `WorkItemSupport.ResolveEngineersAsync` chỉ nhận kỹ sư đang phân công tổ/kíp, người nhập, hoặc KTV đã có trên dòng (kỹ sư đã thôi phân công vẫn giữ được); sai → 400 `engineerIds`. Tối đa 20.
- Form DTO có `engineers` (kỹ sư đang phân công, làm lựa chọn); dòng DTO có `engineers`.
- **Dòng cũ** (chưa lưu KTV theo dòng): vẫn hiện KTV của tổ/kíp như trước; khi sửa, ô KTV điền sẵn KTV của tổ/kíp. **Đưa kế hoạch vào báo cáo**: chép KTV của dòng kế hoạch (người dùng chốt).
- Vật tư: cột KTV lấy KTV của dòng công việc gắn vật tư (dòng cũ: KTV của form). Hộp thoại xung đột so cả ô KTV.

## 14. Nhật ký thay đổi

| Ngày | Nội dung |
|---|---|
| 14/11/2026 | Tạo tài liệu: phân tích 2 file Excel X.CĐNĐ1 (kế hoạch Tuần 02, báo cáo Tuần 01 tháng 11/2026) + ảnh báo cáo X.CĐLG1 Tuần 46; chốt nghiệp vụ, phân quyền, thiết kế dữ liệu/API GĐ 1–2, liên kết với Employees/Organization. Chưa code. |
| 14/11/2026 | Chốt câu hỏi mở 11.1: kíp **không** tự đồng bộ kỹ sư từ sơ đồ, **quản đốc/phó xác nhận** phân công kỹ sư cho kíp (mục 4, 4.1). |
| 14/11/2026 | **GĐ 1 xong code BE, chờ xác nhận** (mục 12): 8 bảng, seeder, 2 mã quyền, API cấu hình/đơn vị/kỹ sư/tuần/phạm vi, tác vụ nền tạo kỳ tuần. Cấu hình hạn đổi sang `DeadlineDayOffset`; hạn riêng chỉ theo xưởng. Thêm hàm đọc ở Organization/Employees. |
| 14/11/2026 | Sửa lỗi build: đổi tên DTO mới thành `UnitMemberSummaryDto` (trùng `UnitMemberDto` của sơ đồ tổ chức). Sửa `SeederExtensions.SeedDataAsync` chưa gọi `WorkReportSeeder`. Build OK, migration đã tạo, seeder OK. Thêm `Docs/TEST_GD1_BAO_CAO_TUAN.md`. |
| 15/11/2026 | Thêm `Docs/TIEP_TUC_CONG_VIEC.md` (bàn giao cho phiên Claude mới). |
| 15/11/2026 | Chốt 8 câu hỏi GĐ 2 theo đề xuất (mục 13.4); xuất Excel làm bước cuối. Rà soát & sửa GĐ 1 (mục 12.5). **GĐ 2 xong code BE (trừ xuất Excel), chờ xác nhận** (mục 13): 5 bảng (migration `AddWorkReportsForms`), lưới, dòng công việc (mã tự sinh có khóa, rowVersion/409), dán Excel, người thực hiện, vật tư, tổng hợp, đồng bộ form. Thêm `ConflictException` (409), `IEquipmentService.GetByCodesAsync`. Thêm `Docs/TEST_GD2_BAO_CAO_TUAN.md`. |
| 15/11/2026 | Thêm `Docs/HUONG_DAN_TEST_BAO_CAO_TUAN.md` (luồng, vai trò API, test từng bước GĐ 1 → 2). |
| 15/11/2026 | **FE GĐ 1–2 xong code, chờ xác nhận** (mục 15): module `workReports` ở Client, 2 trang `/member/work-reports`, `/admin/work-report-settings`; script `Data/Scripts/AddWorkReportPages.sql`. |
| 15/11/2026 | **Đơn vị báo cáo mặc định theo sơ đồ** (mục 4): bỏ bước xác nhận "Tổ/kíp chưa cấu hình" (bỏ API `unconfigured`); `WorkReportUnitSyncService` tự tạo đơn vị cho tổ/kíp (khi mở lưới / danh sách đơn vị, tác vụ nền); thêm `IsCustom` (migration `AddWorkReportUnitCustom`: chỉ mục `OrgUnitId` duy nhất chỉ áp cho đơn vị theo sơ đồ) — đơn vị tự đặt có `OrgUnitId` = đội / xưởng chứa nó; API xóa (chặn khi có dữ liệu), đã xóa, khôi phục, parent-options. `OrgTree.GetTeam` trả chính nó nếu là đội. Test tích hợp (rollback) đạt. |
| 15/11/2026 | **Phân quyền theo role** (mục 5, 15.1): sửa lỗi 2 mã quyền chưa có trong `IdentitySeedData` (DB chưa từng có); thêm `work-reports.submit` (kỹ sư) và `work-reports.manage` (đội trưởng, quản đốc); vai trò trong `WorkReportScopeService` cần quyền tương ứng, bỏ việc trưởng/phó Nhà máy tự xem toàn nhà máy; API gắn `[HasPermission]`. Trang: member (submit), `/admin/work-reports` Quản lý báo cáo tuần (manage, mới), cấu hình vào nhóm menu "Báo cáo tuần", `/work-reports` công khai cho BGĐ (mới, ai cũng xem được, không cần đăng nhập; `PublicWorkReportsController`). Bỏ mã `work-reports.view-factory`. Viết lại `AddWorkReportPages.sql`. |
| 16/11/2026 | **Tách kế hoạch / báo cáo** (mục 16): 2 bộ bảng (migration `SplitWorkPlanReport`, chép dữ liệu cũ), API `/plan/*` và `/report/*` (+ công khai), 2 bảng FE riêng. Ngày bắt đầu / kết thúc. Báo cáo thêm/sửa/xóa tự do; gợi ý từ kế hoạch chỉ người nhập thấy, "Đưa vào báo cáo". 6 quyền thêm/sửa/xóa (`work-reports.plan.*`, `.report.*`) cho role khác ngoài kỹ sư; `manage` chỉ còn cấu hình tổ/kíp + phân công. Bỏ sửa khi khóa, bỏ yêu cầu chỉnh sửa; chỉ admin mở khóa (API `unlock`, nút trên dòng tổ/kíp). Gỡ hẳn dán Excel. |
| 16/11/2026 | Báo cáo: dòng thêm mới / việc phát sinh tự điền giờ công kế hoạch (bắt buộc), giờ thực tế không còn bắt buộc; bỏ dòng gợi ý "≈ giờ" dưới ô giờ công (kế hoạch + báo cáo). |
| 16/11/2026 | **Cập nhật tức thì (SignalR)** (mục 17): hub `/api/hubs/work-reports`, sự kiện `FormChanged` khi lưu/xóa dòng, vật tư, đưa kế hoạch vào báo cáo, mở khóa; Client tự làm mới lưới / Tổng hợp / Vật tư. Thêm gói `@microsoft/signalr`. |
| 17/11/2026 | **Tách quyền** (mục 18): `work-reports.manage` chỉ còn xem + cấu hình tổ/kíp; thêm `work-reports.assign-engineers` (phân công kỹ sư) và `work-reports.unlock` (mở khóa, trước thuộc `configure`), phạm vi theo chức vụ. Script `SplitWorkReportManagePermissions.sql` cấp sẵn quyền mới cho role đang dùng. |
| 17/11/2026 | Tab **Vật tư xưởng** chế độ báo cáo: bỏ cột "Số lượng KH", chỉ còn "Số lượng thực tế" (chế độ kế hoạch giữ "Số lượng KH"). |
| 17/11/2026 | **Người thực hiện** (mục 19): thêm "Cả tổ" (cột `IsWholeUnit`, migration `AddWorkItemIsWholeUnit`, số người = nhân viên tổ/kíp); bỏ gợi ý Đội/Xưởng; ô chọn chỉ hiện tên, hiện đủ tên. |
| 17/11/2026 | **Nhiều kỹ sư cùng nhập** (mục 20): hiện "đang sửa" (SignalR, khóa mềm), hộp thoại xung đột không mất dữ liệu (dòng + vật tư), vật tư có rowVersion (migration `AddWorkMaterialRowVersion`), tooltip người sửa cuối (`updatedByName`). |
| 17/11/2026 | **KTV phụ trách theo dòng** (mục 21): cột JSON `Engineers` (migration `AddWorkItemEngineers`), mặc định người nhập, chọn thêm kỹ sư được phân công tổ; dòng cũ giữ KTV của tổ; đưa KH vào BC chép KTV. |
