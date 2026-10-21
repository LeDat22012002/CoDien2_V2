using System.Globalization;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Server.Shared.Exceptions;

namespace Server.Shared.Helpers;

/// <summary>
/// Đọc ô Excel theo (sheet, dòng, cột số) cho các luồng import (chuyển từ ExcelHelper hệ thống cũ).
/// Cột &lt;= 0 nghĩa là không khai báo cột đó → trả null.
/// </summary>
public static partial class ExcelCellReader
{
    private static readonly string[] VietnameseDateFormats =
    [
        "dd/MM/yyyy HH:mm", "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy",
        "d/M/yyyy HH:mm", "d/M/yyyy H:mm", "d/M/yyyy",
        "dd/MM/yyyy h:mm tt", "d/M/yyyy h:mm:ss tt",
        "yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd",
    ];

    private static readonly string[] UsDateFormats =
    [
        "M/d/yyyy h:mm:ss tt", "M/d/yyyy h:mm tt", "M/d/yyyy HH:mm:ss",
        "M/d/yyyy HH:mm", "M/d/yyyy",
        "MM/dd/yyyy h:mm:ss tt", "MM/dd/yyyy HH:mm", "MM/dd/yyyy",
    ];

    private static readonly string[] TrueValues = ["có", "co", "x", "yes", "y", "true", "1"];

    private static readonly string[] AllowedExtensions = [".xlsx", ".xlsm"];

    public const long MaxFileSize = 20 * 1024 * 1024;

    /// <summary>Dạng giờ trước ngày: "17h10(18/03)", "12:20(15/03)", "01:01(05/08/2026)".</summary>
    [GeneratedRegex(@"^(\d{1,2})\s*[h:\.]\s*(\d{1,2})\s*[\(\[]\s*(\d{1,2})\s*[/\-\.]\s*(\d{1,2})(?:\s*[/\-\.]\s*(\d{2,4}))?\s*[\)\]]?\s*$")]
    private static partial Regex TimeBeforeDateRegex();

    /// <summary>Chỉ có giờ, không có ngày: "17h10", "8:30".</summary>
    [GeneratedRegex(@"^(\d{1,2})\s*[h:\.]\s*(\d{1,2})$")]
    private static partial Regex TimeOnlyRegex();

    /// <summary>"17h10" → "17:10".</summary>
    [GeneratedRegex(@"(?<=\d)h(?=\d)", RegexOptions.IgnoreCase)]
    private static partial Regex HourLetterRegex();

    /// <summary>Kiểm tra file (.xlsx/.xlsm, tối đa 20MB) rồi mở workbook; file hỏng → BusinessException.</summary>
    public static async Task<XLWorkbook> OpenWorkbookAsync(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            throw new BusinessException("Chưa chọn file.");
        }

        if (!AllowedExtensions.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
        {
            throw new BusinessException("Chỉ hỗ trợ file .xlsx hoặc .xlsm.");
        }

        if (file.Length > MaxFileSize)
        {
            throw new BusinessException("File vượt quá 20MB.");
        }

        var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        try
        {
            return new XLWorkbook(stream);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new BusinessException($"Không đọc được file Excel: {ex.Message}");
        }
    }

    /// <summary>Chuỗi đã trim, null nếu rỗng.</summary>
    public static string? GetText(IXLWorksheet sheet, int row, int column)
    {
        if (column <= 0)
        {
            return null;
        }

        var value = sheet.Cell(row, column).GetFormattedString();
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    /// <summary>
    /// Ô ngày giờ Excel, số serial, hoặc chuỗi gõ tay ("17h10(18/03)", "6/25/2024 8:00:00 PM").
    /// defaultYear dùng cho ô không ghi năm; 0 = năm hiện tại.
    /// </summary>
    public static DateTime? GetDateTime(IXLWorksheet sheet, int row, int column, int defaultYear = 0)
    {
        if (column <= 0)
        {
            return null;
        }

        var cell = sheet.Cell(row, column);
        if (cell.IsEmpty())
        {
            return null;
        }

        if (cell.DataType == XLDataType.DateTime)
        {
            return cell.GetDateTime();
        }

        if (cell.DataType == XLDataType.Number)
        {
            try
            {
                return DateTime.FromOADate(cell.GetDouble());
            }
            catch (ArgumentException)
            {
                return null;
            }
        }

        return ParseDateTimeText(cell.GetFormattedString(), defaultYear);
    }

    /// <summary>
    /// Ô số. Ô định dạng phần trăm lưu 100% là 1 nên nhân 100 để ra đúng số người dùng thấy.
    /// Chấp nhận cả "80", "80%", "80,5".
    /// </summary>
    public static decimal? GetNumber(IXLWorksheet sheet, int row, int column)
    {
        if (column <= 0)
        {
            return null;
        }

        var cell = sheet.Cell(row, column);
        if (cell.IsEmpty())
        {
            return null;
        }

        if (cell.DataType == XLDataType.Number)
        {
            var number = (decimal)cell.GetDouble();
            var formatId = cell.Style.NumberFormat.NumberFormatId;
            var formatText = cell.Style.NumberFormat.Format ?? string.Empty;

            return formatId is 9 or 10 || formatText.Contains('%') ? number * 100 : number;
        }

        var text = cell.GetFormattedString().Trim().Replace("%", "").Replace(",", ".");
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        return decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    /// <summary>Trống hoặc "Không" = false; "Có", "x", "yes", "1"… = true.</summary>
    public static bool GetBoolean(IXLWorksheet sheet, int row, int column)
    {
        var text = GetText(sheet, row, column);
        return text is not null && TrueValues.Contains(text.ToLowerInvariant());
    }

    /// <summary>Phân tích chuỗi ngày giờ theo nhiều định dạng; null nếu không nhận dạng được hoặc thiếu ngày.</summary>
    public static DateTime? ParseDateTimeText(string? text, int defaultYear = 0)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        text = text.Trim();
        var year = defaultYear > 0 ? defaultYear : DateTime.Now.Year;

        var match = TimeBeforeDateRegex().Match(text);
        if (match.Success)
        {
            if (match.Groups[5].Success)
            {
                var parsedYear = int.Parse(match.Groups[5].Value);
                year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
            }

            return CreateDateTime(
                year,
                month: int.Parse(match.Groups[4].Value),
                day: int.Parse(match.Groups[3].Value),
                hour: int.Parse(match.Groups[1].Value),
                minute: int.Parse(match.Groups[2].Value));
        }

        if (TimeOnlyRegex().IsMatch(text))
        {
            return null;
        }

        var normalized = HourLetterRegex().Replace(text, ":");

        // Ưu tiên định dạng Việt Nam (ngày trước tháng), rồi mới tới định dạng Mỹ
        if (DateTime.TryParseExact(normalized, VietnameseDateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var vietnamese))
        {
            return vietnamese;
        }

        var usCulture = CultureInfo.GetCultureInfo("en-US");
        if (DateTime.TryParseExact(normalized, UsDateFormats, usCulture, DateTimeStyles.None, out var us))
        {
            return us;
        }

        if (DateTime.TryParse(normalized, CultureInfo.GetCultureInfo("vi-VN"), DateTimeStyles.None, out var loose))
        {
            return loose;
        }

        return DateTime.TryParse(normalized, usCulture, DateTimeStyles.None, out var looseUs) ? looseUs : null;
    }

    /// <summary>Tìm sheet theo tên, bỏ qua hoa thường và khoảng trắng thừa.</summary>
    public static IXLWorksheet? FindSheet(XLWorkbook workbook, string? sheetName)
    {
        if (string.IsNullOrWhiteSpace(sheetName))
        {
            return null;
        }

        return workbook.Worksheets.FirstOrDefault(
            x => x.Name.Trim().Equals(sheetName.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Số dòng cuối có dữ liệu của sheet.</summary>
    public static int GetLastUsedRow(IXLWorksheet sheet) => sheet.RangeUsed()?.LastRow().RowNumber() ?? 0;

    /// <summary>Cắt chuỗi vượt độ dài cột.</summary>
    public static string? Truncate(string? value, int maxLength) =>
        string.IsNullOrEmpty(value) || value.Length <= maxLength ? value : value[..maxLength];

    private static DateTime? CreateDateTime(int year, int month, int day, int hour, int minute)
    {
        if (month is < 1 or > 12 || day < 1 || day > DateTime.DaysInMonth(year, month)
            || hour is < 0 or > 23 || minute is < 0 or > 59)
        {
            return null;
        }

        return new DateTime(year, month, day, hour, minute, 0);
    }
}
