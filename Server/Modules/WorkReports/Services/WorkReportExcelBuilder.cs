using ClosedXML.Excel;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>1 tổ/kíp cần xuất: thông tin form + dòng công việc (đã xếp theo đầu mục, mã; TT trong đầu mục).</summary>
public sealed record WorkReportExportForm(WeeklyFormDto Form, IReadOnlyList<WorkItemDtoBase> Items);

/// <summary>Dữ liệu 1 file xuất (1 xưởng, 1 tuần, 1 giai đoạn).</summary>
public sealed record WorkReportExportData(
    string Phase,
    string WorkshopName,
    WorkWeekDto Week,
    IReadOnlyList<WorkCategoryDto> Categories,
    IReadOnlyList<WorkReportExportForm> Forms,
    WorkReportSummaryDto Summary,
    IReadOnlyList<WorkMaterialDto> Materials);

/// <summary>
/// Dựng file Excel theo form các xưởng đang dùng (mẫu X.CĐNĐ1): sheet TỔNG HỢP DỮ LIỆU, VẬT TƯ SỬ DỤNG, mỗi tổ/kíp
/// 1 sheet. Báo cáo 18 cột (1)–(18); kế hoạch 12 cột (bỏ (12)–(17) của báo cáo, Ghi chú là (12)).
/// Tiêu đề 1 dòng: "BÁO CÁO CÔNG VIỆC – TỔ … – XƯỞNG … – TUẦN 47 THÁNG 11 NĂM 2026".
/// Ô ghi giá trị (khớp web); chỉ dòng tổng của Tổng hợp dùng SUM. Tổ/kíp chưa khóa: cột Ghi chú của Tổng hợp ghi "Chưa chốt".
/// Không có sheet hướng dẫn nhập, dropdown: dữ liệu nhập trên web.
/// </summary>
public static class WorkReportExcelBuilder
{
    private const string FontName = "Times New Roman";
    private const double BodyFontSize = 12;

    // Màu theo mẫu: tiêu đề cột (xanh dương nhạt), dòng tổ/kíp (vàng nhạt), dòng đầu mục (xanh lá nhạt)
    private static readonly XLColor HeaderFill = XLColor.FromHtml("#B4C6E7");
    private static readonly XLColor UnitFill = XLColor.FromHtml("#FFF2CC");
    private static readonly XLColor CategoryFill = XLColor.FromHtml("#C6E0B4");
    private static readonly XLColor Red = XLColor.FromHtml("#FF0000");

    private const string SummarySheetName = "TỔNG HỢP DỮ LIỆU";
    private const string MaterialSheetName = "VẬT TƯ SỬ DỤNG";
    private const string NumberFormat = "#,##0.##";
    private const string DateFormat = "dd/MM/yyyy";
    private const string WholeUnitLabel = "Cả tổ";

    /// <summary>Cột của sheet tổ/kíp: tiêu đề tầng 1, tầng 2 (null = gộp 2 tầng), độ rộng.</summary>
    private sealed record Column(string Group, string? Sub, double Width);

    private static readonly Column[] ReportColumns =
    [
        new("TT", null, 7),
        new("Tổ thực hiện", null, 23.4),
        new("Công việc thực hiện", null, 15.4),
        new("Mã công việc", null, 23),
        new("Equipment", null, 27.6),
        new("Hạng mục công việc", null, 51.3),
        new("Ngày thực hiện", null, 17.7),
        new("Nhân sự thực hiện (Người)", "Số người thực hiện", 10.3),
        new("Nhân sự thực hiện (Người)", "Tên người thực hiện", 32.1),
        new("Nhân sự thực hiện (Người)", "Tên KTV phụ trách", 20.4),
        new("Giờ công thực hiện (phút)", "Theo kế hoạch", 11),
        new("Giờ công thực hiện (phút)", "Theo thực tế", 11),
        new("Giờ công thực hiện (phút)", "Chênh lệch", 11),
        new("Kết quả thực hiện thực tế (%)", null, 15.4),
        new("GPLV", null, 12),
        new("5S", null, 22.6),
        new("Diễn giải (Phương án, biện pháp xử lý, lý do chưa hoàn thành)", null, 33.6),
        new("Ghi chú", null, 37.4),
    ];

    private static readonly Column[] PlanColumns =
    [
        .. ReportColumns[..10],
        new("Giờ công thực hiện (phút)", "Theo kế hoạch", 31.1),
        new("Ghi chú", null, 37.4),
    ];

    public static byte[] Build(WorkReportExportData data)
    {
        using var workbook = new XLWorkbook();
        workbook.Style.Font.FontName = FontName;
        workbook.Style.Font.FontSize = BodyFontSize;

        var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { SummarySheetName, MaterialSheetName };
        BuildSummarySheet(workbook.Worksheets.Add(SummarySheetName), data);
        BuildMaterialSheet(workbook.Worksheets.Add(MaterialSheetName), data);
        foreach (var form in data.Forms)
        {
            BuildUnitSheet(workbook.Worksheets.Add(UniqueSheetName(form.Form.UnitName, usedNames)), data, form);
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>"Báo cáo công việc - Xưởng Cơ điện Nhiệt điện 1 - Tuần 45 tháng 11 năm 2026.xlsx".</summary>
    public static string BuildFileName(string phase, string workshopName, WorkWeekDto week)
    {
        var head = IsPlan(phase) ? "Kế hoạch công việc" : "Báo cáo công việc";
        var name = $"{head} - {workshopName} - Tuần {week.IsoWeek:D2} tháng {week.LabelMonth:D2} năm {week.LabelYear}";
        var invalid = Path.GetInvalidFileNameChars()
            .Concat(new[] { '"', '<', '>', '|', ':', '*', '?', '/', '\\' })
            .ToHashSet();
        return new string(name.Select(x => invalid.Contains(x) ? '-' : x).ToArray()).Trim() + ".xlsx";
    }

    // ===== Sheet tổ/kíp =====

    private static void BuildUnitSheet(IXLWorksheet sheet, WorkReportExportData data, WorkReportExportForm export)
    {
        var isPlan = IsPlan(data.Phase);
        var columns = isPlan ? PlanColumns : ReportColumns;
        var lastColumn = columns.Length;
        var form = export.Form;

        // Dòng 1: "BÁO CÁO CÔNG VIỆC – TỔ … – XƯỞNG … – TUẦN 47 THÁNG 11 NĂM 2026"
        // Cao đủ 2 dòng chữ 20pt khi tên dài (bảng kế hoạch hẹp hơn báo cáo)
        WriteTitle(sheet, lastColumn, 54,
            $"{(isPlan ? "KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO" : "BÁO CÁO CÔNG VIỆC")} – {form.UnitName} – " +
            $"{data.WorkshopName} – {WeekText(data.Week)}");

        // Dòng 2–4: tiêu đề cột 2 tầng + số cột (1)…(n)
        WriteColumnHeader(sheet, columns, headerRow: 2);
        for (var index = 0; index < columns.Length; index++)
        {
            sheet.Column(index + 1).Width = columns[index].Width;
        }

        var row = 5;
        // Dòng tổ/kíp: "I | Tổ CK-TBMP"
        WriteGroupRow(sheet, row++, lastColumn, form.OrderLabel, form.UnitName, UnitFill);

        var itemsByCategory = export.Items.ToLookup(x => x.WorkCategoryId);
        foreach (var category in data.Categories.Where(x => x.IsActive || itemsByCategory[x.Id].Any()))
        {
            // Dòng đầu mục: "A | Bảo trì level 1" (đủ A→… như mẫu, kể cả đầu mục chưa có dòng)
            WriteGroupRow(sheet, row++, lastColumn, category.GroupLetter, category.Name, CategoryFill);
            foreach (var item in itemsByCategory[category.Id])
            {
                WriteItemRow(sheet, row++, isPlan, form, item);
            }
        }

        var body = sheet.Range(5, 1, Math.Max(row - 1, 5), lastColumn);
        ApplyBorders(body);
        body.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        sheet.SheetView.FreezeRows(4);
        SetupPrint(sheet, headerRows: 4);
    }

    private static void WriteItemRow(IXLWorksheet sheet, int row, bool isPlan, WeeklyFormDto form, WorkItemDtoBase item)
    {
        var cells = sheet.Range(row, 1, row, isPlan ? PlanColumns.Length : ReportColumns.Length);
        cells.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        cells.Style.Alignment.WrapText = true;

        Set(sheet.Cell(row, 1), item.Tt);
        var unitCell = sheet.Cell(row, 2);
        unitCell.Value = form.UnitName;
        unitCell.Style.Fill.BackgroundColor = UnitFill;
        unitCell.Style.Font.Bold = true;
        unitCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        sheet.Cell(row, 3).Value = item.CategoryCode;
        sheet.Cell(row, 4).Value = item.Code;
        sheet.Cell(row, 5).Value = item.EquipmentCode ?? item.EquipmentName ?? string.Empty;
        var description = sheet.Cell(row, 6);
        description.Value = item.Description;
        description.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        WriteDates(sheet.Cell(row, 7), item.StartDate, item.EndDate);
        Set(sheet.Cell(row, 8), item.WorkerCount);
        sheet.Cell(row, 9).Value = WorkersText(item);
        sheet.Cell(row, 10).Value = item.Engineers.Count > 0
            ? string.Join(", ", item.Engineers.Select(x => x.FullName))
            : form.EngineerNames ?? string.Empty;

        switch (item)
        {
            case WorkPlanItemDto plan:
                SetNumber(sheet.Cell(row, 11), plan.PlannedMinutes);
                sheet.Cell(row, 12).Value = plan.Note ?? string.Empty;
                break;
            case WorkReportItemDto report:
                SetNumber(sheet.Cell(row, 11), report.PlannedMinutes);
                SetNumber(sheet.Cell(row, 12), report.EffectiveActualMinutes);
                // (13) Chênh lệch = kế hoạch − thực tế (âm = làm vượt giờ kế hoạch: chữ đỏ)
                var diff = sheet.Cell(row, 13);
                SetNumber(diff, report.DiffMinutes);
                if (report.DiffMinutes < 0)
                {
                    diff.Style.Font.FontColor = Red;
                }

                if (report.ResultPercent is { } percent)
                {
                    var result = sheet.Cell(row, 14);
                    result.Value = (double)(percent / 100);
                    result.Style.NumberFormat.Format = "0%";
                }

                sheet.Cell(row, 15).Value = report.WorkPermit ?? string.Empty;
                sheet.Cell(row, 16).Value = report.FiveS ?? string.Empty;
                sheet.Cell(row, 17).Value = report.Explanation ?? string.Empty;
                sheet.Cell(row, 18).Value = report.Note ?? string.Empty;
                break;
        }
    }

    /// <summary>(9) Người thực hiện: "Cả tổ" / "Cả tổ Lò cao 1, 2" hoặc tên từng người.</summary>
    private static string WorkersText(WorkItemDtoBase item)
    {
        if (!item.IsWholeUnit)
        {
            return string.Join(", ", item.Workers.Select(x => x.DisplayName));
        }

        return item.WholeGroups.Count == 0
            ? WholeUnitLabel
            : string.Join(", ", item.WholeGroups.Select(x => $"{WholeUnitLabel} {GroupShortName(x.Name)}"));
    }

    /// <summary>Tên ngắn của tổ: phần sau dấu " - " cuối ("Tổ Cơ khí - Lọc bụi - Lò cao 1, 2" → "Lò cao 1, 2").</summary>
    private static string GroupShortName(string name)
    {
        var index = name.LastIndexOf(" - ", StringComparison.Ordinal);
        var shortName = index >= 0 ? name[(index + 3)..].Trim() : name.Trim();
        return shortName.Length > 0 ? shortName : name;
    }

    /// <summary>(7) 1 ngày: ô ngày thật dd/MM/yyyy; nhiều ngày: chữ "16/11 – 18/11/2026".</summary>
    private static void WriteDates(IXLCell cell, DateOnly start, DateOnly end)
    {
        if (start == end)
        {
            cell.Value = start.ToDateTime(TimeOnly.MinValue);
            cell.Style.NumberFormat.Format = DateFormat;
            return;
        }

        cell.Value = start.Year == end.Year
            ? $"{start:dd/MM} – {end:dd/MM/yyyy}"
            : $"{start:dd/MM/yyyy} – {end:dd/MM/yyyy}";
    }

    // ===== Sheet TỔNG HỢP DỮ LIỆU =====

    private static void BuildSummarySheet(IXLWorksheet sheet, WorkReportExportData data)
    {
        var summary = data.Summary;
        var categoryColumns = summary.Columns;
        // STT, Tổ, KTV, Số đầu MVT, [đầu mục…], Tổng giờ công, Tổng nhân lực, Ghi chú
        var totalColumn = 5 + categoryColumns.Count;
        var manpowerColumn = totalColumn + 1;
        var noteColumn = totalColumn + 2;

        WriteTitle(sheet, noteColumn, 40,
            $"TỔNG HỢP DỮ LIỆU {(IsPlan(data.Phase) ? "KẾ HOẠCH TUẦN TIẾP THEO" : "BÁO CÁO")} – " +
            $"{data.WorkshopName} – {WeekText(data.Week)}",
            titleSize: 16);

        var headers = new List<string> { "STT", "Tổ thực hiện", "KTV phụ trách", "Số lượng đầu MVT" };
        headers.AddRange(categoryColumns.Select(x => $"{x.Code}\n(Phút)"));
        headers.AddRange(["Tổng giờ công\n(Phút)", "Tổng nhân lực (người)", "Ghi chú"]);
        for (var index = 0; index < headers.Count; index++)
        {
            sheet.Cell(2, index + 1).Value = headers[index];
            sheet.Cell(3, index + 1).Value = $"({index + 1})";
        }

        StyleHeader(sheet.Range(2, 1, 2, noteColumn), sheet.Range(3, 1, 3, noteColumn));
        sheet.Row(2).Height = 45.75;
        sheet.Row(3).Height = 18.75;

        var row = 4;
        var firstDataRow = row;
        var index2 = 1;
        foreach (var item in summary.Rows)
        {
            Set(sheet.Cell(row, 1), index2++);
            var unit = sheet.Cell(row, 2);
            unit.Value = item.UnitName;
            unit.Style.Fill.BackgroundColor = UnitFill;
            unit.Style.Font.Bold = true;
            unit.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
            sheet.Cell(row, 3).Value = item.EngineerNames ?? string.Empty;
            Set(sheet.Cell(row, 4), item.MaterialCodeCount);
            for (var column = 0; column < categoryColumns.Count; column++)
            {
                SetNumber(sheet.Cell(row, 5 + column), item.MinutesByCategory.GetValueOrDefault(categoryColumns[column].Id));
            }

            SetNumber(sheet.Cell(row, totalColumn), item.TotalMinutes);
            var manpower = sheet.Cell(row, manpowerColumn);
            manpower.Value = (double)item.Manpower;
            manpower.Style.NumberFormat.Format = "#,##0.00";
            sheet.Cell(row, noteColumn).Value = item.Status == FormPhaseStatuses.Locked ? string.Empty : "Chưa chốt";
            sheet.Row(row).Height = 30;
            row++;
        }

        // Dòng tổng: SUM như mẫu
        var lastDataRow = row - 1;
        sheet.Cell(row, 2).Value = "Tổng";
        if (lastDataRow >= firstDataRow)
        {
            for (var column = 4; column <= manpowerColumn; column++)
            {
                var cell = sheet.Cell(row, column);
                var letter = XLHelper.GetColumnLetterFromNumber(column);
                cell.FormulaA1 = $"SUM({letter}{firstDataRow}:{letter}{lastDataRow})";
                cell.Style.NumberFormat.Format = column == manpowerColumn ? "#,##0.00" : NumberFormat;
            }
        }

        var totalRange = sheet.Range(row, 1, row, noteColumn);
        totalRange.Style.Font.Bold = true;
        var body = sheet.Range(firstDataRow, 1, row, noteColumn);
        ApplyBorders(body);
        body.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        body.Style.Alignment.WrapText = true;
        sheet.Range(firstDataRow, 1, row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        sheet.Range(firstDataRow, 4, row, noteColumn).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Giờ công hiệu dụng/tuần (như mẫu, cạnh bảng)
        var constantsColumn = noteColumn + 2;
        var hc = summary.Rows.FirstOrDefault(x => x.LaborType == "HC")?.CapacityMinutes;
        var kip = summary.Rows.FirstOrDefault(x => x.LaborType == "KIP")?.CapacityMinutes;
        sheet.Cell(1, constantsColumn).Value = "*** Giờ công hiệu dụng/tuần";
        sheet.Cell(1, constantsColumn).Style.Font.Bold = true;
        sheet.Cell(2, constantsColumn).Value = "Hành chính\n(Phút)";
        sheet.Cell(2, constantsColumn + 1).Value = "Kíp\n(Phút)";
        SetNumber(sheet.Cell(3, constantsColumn), hc);
        SetNumber(sheet.Cell(3, constantsColumn + 1), kip);
        var constants = sheet.Range(2, constantsColumn, 3, constantsColumn + 1);
        constants.Style.Fill.BackgroundColor = UnitFill;
        constants.Style.Font.Bold = true;
        constants.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        constants.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        constants.Style.Alignment.WrapText = true;
        ApplyBorders(constants);

        // Ghi chú dưới bảng
        var noteRow = row + 2;
        string[] notes =
        [
            "*** Chú ý:",
            "- Cột (4): chỉ thống kê số mã vật tư khác nhau, không cộng số lượng của từng mã.",
            $"- Tổng nhân lực = tổng giờ công ÷ giờ công hiệu dụng/tuần của tổ/kíp (HC: {FormatMinutes(hc)} phút; Kíp: {FormatMinutes(kip)} phút).",
            IsPlan(data.Phase)
                ? "- Giờ công: cột (11) Theo kế hoạch của từng tổ/kíp."
                : "- Giờ công: cột (12) Theo thực tế của từng tổ/kíp (ô trống = theo kế hoạch).",
        ];
        foreach (var note in notes)
        {
            var cell = sheet.Cell(noteRow++, 1);
            cell.Value = note;
            cell.Style.Font.Italic = true;
        }

        sheet.Column(1).Width = 7;
        sheet.Column(2).Width = 25.4;
        sheet.Column(3).Width = 27.6;
        sheet.Column(4).Width = 11;
        for (var column = 5; column < totalColumn; column++)
        {
            sheet.Column(column).Width = 12.6;
        }

        sheet.Column(totalColumn).Width = 16.3;
        sheet.Column(manpowerColumn).Width = 15.9;
        sheet.Column(noteColumn).Width = 24.7;
        sheet.Column(constantsColumn).Width = 20.7;
        sheet.Column(constantsColumn + 1).Width = 14.7;

        sheet.SheetView.FreezeRows(3);
        SetupPrint(sheet, headerRows: 3);
    }

    // ===== Sheet VẬT TƯ SỬ DỤNG =====

    private static void BuildMaterialSheet(IXLWorksheet sheet, WorkReportExportData data)
    {
        const int lastColumn = 10;
        var isPlan = IsPlan(data.Phase);
        WriteTitle(sheet, lastColumn, 40,
            $"{(isPlan ? "THỐNG KÊ VẬT TƯ SỬ DỤNG TUẦN TIẾP THEO" : "BÁO CÁO VẬT TƯ SỬ DỤNG")} – " +
            $"{data.WorkshopName} – {WeekText(data.Week)}");

        string[] headers =
        [
            "TT", "Mã công việc", "Mã VT", "Tên VT\n(Tên ngắn)", "ĐVT",
            isPlan ? "Số lượng" : "Số lượng thực tế", "KTV phụ trách", "Ghi chú", "Ngày sử dụng", "Mục đích sử dụng",
        ];
        double[] widths = [6.9, 25.3, 23.4, 53.4, 10.4, 12, 26.7, 57.7, 16.4, 16];
        for (var index = 0; index < headers.Length; index++)
        {
            sheet.Cell(2, index + 1).Value = headers[index];
            sheet.Cell(3, index + 1).Value = $"({index + 1})";
            sheet.Column(index + 1).Width = widths[index];
        }

        StyleHeader(sheet.Range(2, 1, 2, lastColumn), sheet.Range(3, 1, 3, lastColumn));
        sheet.Row(2).Height = 39.75;

        var row = 4;
        var materialsByForm = data.Materials.ToLookup(x => x.WeeklyFormId);
        foreach (var export in data.Forms)
        {
            var form = export.Form;
            WriteGroupRow(sheet, row++, lastColumn, form.OrderLabel, form.UnitName, UnitFill);
            var tt = 1;
            foreach (var material in materialsByForm[form.FormId]
                         .OrderBy(x => x.WorkItemCode, StringComparer.Ordinal).ThenBy(x => x.Id))
            {
                var cells = sheet.Range(row, 1, row, lastColumn);
                cells.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cells.Style.Alignment.WrapText = true;
                Set(sheet.Cell(row, 1), tt++);
                sheet.Cell(row, 2).Value = material.WorkItemCode;
                sheet.Cell(row, 3).Value = material.MaterialCode ?? string.Empty;
                var name = sheet.Cell(row, 4);
                name.Value = material.MaterialName;
                name.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                sheet.Cell(row, 5).Value = material.Uom ?? string.Empty;
                // Kế hoạch: số lượng KH; báo cáo: thực tế (trống = kế hoạch)
                SetNumber(sheet.Cell(row, 6), isPlan ? material.PlannedQuantity : material.EffectiveActualQuantity);
                sheet.Cell(row, 7).Value = material.EngineerNames ?? form.EngineerNames ?? string.Empty;
                var note = sheet.Cell(row, 8);
                note.Value = material.Note ?? string.Empty;
                note.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                if (material.UsageDate is { } date)
                {
                    sheet.Cell(row, 9).Value = date.ToDateTime(TimeOnly.MinValue);
                    sheet.Cell(row, 9).Style.NumberFormat.Format = DateFormat;
                }

                sheet.Cell(row, 10).Value = material.MaterialPurposeCode ?? string.Empty;
                row++;
            }
        }

        if (row > 4)
        {
            var body = sheet.Range(4, 1, row - 1, lastColumn);
            ApplyBorders(body);
            body.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }

        sheet.SheetView.FreezeRows(3);
        SetupPrint(sheet, headerRows: 3);
    }

    // ===== Dùng chung =====

    private static bool IsPlan(string phase) => phase == WorkReportPhases.Plan;

    /// <summary>"Tuần 47 tháng 11 năm 2026" (tháng, năm theo ngày thứ 2 của tuần).</summary>
    private static string WeekText(WorkWeekDto week) =>
        $"Tuần {week.IsoWeek:D2} tháng {week.LabelMonth:D2} năm {week.LabelYear}";

    /// <summary>Dòng 1 gộp ô: tiêu đề in hoa, đậm, căn giữa (1 dòng; dài quá thì tự xuống dòng).</summary>
    private static void WriteTitle(IXLWorksheet sheet, int lastColumn, double height, string title, double titleSize = 20)
    {
        var range = sheet.Range(1, 1, 1, lastColumn);
        range.Merge();
        sheet.Cell(1, 1).Value = title.ToUpperInvariant();
        range.Style.Font.Bold = true;
        range.Style.Font.FontSize = titleSize;
        range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        range.Style.Alignment.WrapText = true;
        sheet.Row(1).Height = height;
    }

    /// <summary>Tiêu đề cột 2 tầng (gộp nhóm H:J, K:M…; cột 1 tầng gộp dọc) + dòng số cột (1)…(n).</summary>
    private static void WriteColumnHeader(IXLWorksheet sheet, Column[] columns, int headerRow)
    {
        var subRow = headerRow + 1;
        var numberRow = headerRow + 2;
        var index = 0;
        while (index < columns.Length)
        {
            var column = columns[index];
            var from = index + 1;
            if (column.Sub is null)
            {
                sheet.Cell(headerRow, from).Value = column.Group;
                sheet.Range(headerRow, from, subRow, from).Merge();
                index++;
                continue;
            }

            // Nhóm cột liền nhau cùng tiêu đề tầng 1
            var to = from;
            while (to < columns.Length && columns[to].Group == column.Group && columns[to].Sub is not null)
            {
                to++;
            }

            sheet.Cell(headerRow, from).Value = column.Group;
            if (to > from)
            {
                sheet.Range(headerRow, from, headerRow, to).Merge();
            }

            for (var sub = from; sub <= to; sub++)
            {
                sheet.Cell(subRow, sub).Value = columns[sub - 1].Sub;
            }

            index = to;
        }

        for (var number = 1; number <= columns.Length; number++)
        {
            sheet.Cell(numberRow, number).Value = $"({number})";
        }

        StyleHeader(sheet.Range(headerRow, 1, subRow, columns.Length), sheet.Range(numberRow, 1, numberRow, columns.Length));
        sheet.Row(headerRow).Height = 25.5;
        sheet.Row(subRow).Height = 45.75;
        sheet.Row(numberRow).Height = 18;
    }

    private static void StyleHeader(IXLRange header, IXLRange numbers)
    {
        foreach (var range in new[] { header, numbers })
        {
            range.Style.Fill.BackgroundColor = HeaderFill;
            range.Style.Font.Bold = true;
            range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            range.Style.Alignment.WrapText = true;
            ApplyBorders(range);
        }

        numbers.Style.Font.Italic = true;
        numbers.Style.Font.FontSize = 10;
    }

    /// <summary>Dòng nhóm (tổ/kíp, đầu mục): ô A nhãn (I, A…), ô B tên, tô màu cả dòng.</summary>
    private static void WriteGroupRow(IXLWorksheet sheet, int row, int lastColumn, string label, string name, XLColor fill)
    {
        var range = sheet.Range(row, 1, row, lastColumn);
        range.Style.Fill.BackgroundColor = fill;
        range.Style.Font.Bold = true;
        sheet.Cell(row, 1).Value = label;
        sheet.Cell(row, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        sheet.Cell(row, 2).Value = name;
        sheet.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        sheet.Row(row).Height = 27.75;
    }

    private static void ApplyBorders(IXLRange range)
    {
        range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
    }

    /// <summary>In ngang, vừa 1 trang theo chiều ngang, lặp dòng tiêu đề mỗi trang.</summary>
    private static void SetupPrint(IXLWorksheet sheet, int headerRows)
    {
        sheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        sheet.PageSetup.PaperSize = XLPaperSize.A4Paper;
        sheet.PageSetup.FitToPages(1, 0);
        sheet.PageSetup.SetRowsToRepeatAtTop(1, headerRows);
    }

    private static void Set(IXLCell cell, int? value)
    {
        if (value is { } number)
        {
            cell.Value = number;
        }
    }

    private static void SetNumber(IXLCell cell, decimal? value)
    {
        if (value is { } number)
        {
            cell.Value = (double)number;
            cell.Style.NumberFormat.Format = NumberFormat;
        }
    }

    /// <summary>Số kiểu Việt Nam (2.467,44), không phụ thuộc culture của Server.</summary>
    private static readonly System.Globalization.NumberFormatInfo VietnameseNumber = new()
    {
        NumberGroupSeparator = ".",
        NumberDecimalSeparator = ",",
    };

    private static string FormatMinutes(decimal? minutes) =>
        minutes is { } value ? value.ToString("#,##0.##", VietnameseNumber) : "—";

    /// <summary>Tên sheet hợp lệ (≤ 31 ký tự, bỏ []:*?/\) và không trùng.</summary>
    private static string UniqueSheetName(string name, HashSet<string> used)
    {
        var cleaned = new string(name.Where(x => !"[]:*?/\\".Contains(x)).ToArray()).Trim().Trim('\'');
        if (cleaned.Length == 0)
        {
            cleaned = "Tổ";
        }

        var candidate = cleaned.Length > 31 ? cleaned[..31] : cleaned;
        var suffix = 2;
        while (!used.Add(candidate))
        {
            var tail = $" ({suffix++})";
            candidate = (cleaned.Length + tail.Length > 31 ? cleaned[..(31 - tail.Length)] : cleaned) + tail;
        }

        return candidate;
    }
}