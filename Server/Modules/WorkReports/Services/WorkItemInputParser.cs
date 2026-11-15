using System.Globalization;
using System.Text.RegularExpressions;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Đọc giá trị ô dán từ Excel (chuỗi thô) thành dữ liệu chuẩn; lỗi trả về chuỗi thông báo tiếng Việt.</summary>
public static partial class WorkItemInputParser
{
    [GeneratedRegex(@"(\d{4})-(\d{1,2})-(\d{1,2})")]
    private static partial Regex IsoDateRegex();

    [GeneratedRegex(@"(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?")]
    private static partial Regex DayMonthRegex();

    [GeneratedRegex(@"^(\d+(?:\.\d+)?)(h|g|gio)$")]
    private static partial Regex HoursRegex();

    [GeneratedRegex(@"^(\d+(?:\.\d+)?)(p|ph|phut|m|min|')$")]
    private static partial Regex MinutesRegex();

    [GeneratedRegex(@"^\d{1,3}([.,]\d{3})+$")]
    private static partial Regex ThousandsRegex();

    private static readonly char[] WorkerSeparators = [',', ';', '\n', '\r', '+'];

    /// <summary>
    /// Ngày: dd/MM/yyyy, d/M/yy, d/M (năm theo tuần), yyyy-MM-dd, số ngày Excel, hoặc chuỗi có ngày
    /// (vd "Từ 20h00 ngày 31/10 đến 08h00 ngày 01/11" → 31/10, ca đêm tính theo ngày bắt đầu).
    /// </summary>
    public static bool TryParseDate(string? raw, WorkWeek week, out DateOnly? date, out string? error)
    {
        date = null;
        error = null;
        var text = raw?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return true;
        }

        if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var serial)
            && serial is > 20000 and < 80000)
        {
            date = DateOnly.FromDateTime(DateTime.FromOADate(Math.Floor(serial)));
            return true;
        }

        if (IsoDateRegex().Match(text) is { Success: true } iso
            && TryCreate(int.Parse(iso.Groups[1].Value), int.Parse(iso.Groups[2].Value), int.Parse(iso.Groups[3].Value), out var isoDate))
        {
            date = isoDate;
            return true;
        }

        if (DayMonthRegex().Match(text) is { Success: true } match)
        {
            var day = int.Parse(match.Groups[1].Value);
            var month = int.Parse(match.Groups[2].Value);
            if (match.Groups[3].Success)
            {
                var year = int.Parse(match.Groups[3].Value);
                if (year < 100)
                {
                    year += 2000;
                }

                if (TryCreate(year, month, day, out var full))
                {
                    date = full;
                    return true;
                }
            }
            else
            {
                // Không có năm: lấy năm làm ngày rơi vào tuần (tuần vắt năm có 2 năm)
                foreach (var year in new[] { week.StartDate.Year, week.EndDate.Year }.Distinct())
                {
                    if (TryCreate(year, month, day, out var candidate)
                        && candidate >= week.StartDate && candidate <= week.EndDate)
                    {
                        date = candidate;
                        return true;
                    }
                }

                if (TryCreate(week.StartDate.Year, month, day, out var fallback))
                {
                    date = fallback;
                    return true;
                }
            }
        }

        error = "Ngày không hợp lệ (nhập dạng dd/MM/yyyy).";
        return false;
    }

    /// <summary>Phút: số trần = số phút; "8h" / "1,5h" = số người × giờ × 60; "30p" = 30 phút.</summary>
    public static bool TryParseMinutes(string? raw, int workerCount, out decimal? minutes, out string? error)
    {
        minutes = null;
        error = null;
        var text = TextNormalizer.ToKey(raw).Replace(" ", string.Empty);
        if (text.Length == 0)
        {
            return true;
        }

        if (ThousandsRegex().IsMatch(text))
        {
            text = text.Replace(".", string.Empty).Replace(",", string.Empty);
        }

        text = text.Replace(',', '.');

        if (HoursRegex().Match(text) is { Success: true } hours)
        {
            minutes = Math.Round(decimal.Parse(hours.Groups[1].Value, CultureInfo.InvariantCulture)
                                 * 60 * Math.Max(1, workerCount), 2);
            return true;
        }

        if (MinutesRegex().Match(text) is { Success: true } mins)
        {
            minutes = Math.Round(decimal.Parse(mins.Groups[1].Value, CultureInfo.InvariantCulture), 2);
            return true;
        }

        if (decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var value))
        {
            minutes = Math.Round(value, 2);
            return true;
        }

        error = "Giờ công không hợp lệ: nhập số phút hoặc dạng 8h (= số người × 8 × 60).";
        return false;
    }

    /// <summary>Kết quả %: "100%", "100"; số thập phân 0–1 không có dấu % (ô % của Excel) nhân 100.</summary>
    public static bool TryParsePercent(string? raw, out decimal? percent, out string? error)
    {
        percent = null;
        error = null;
        var text = raw?.Trim().Replace(" ", string.Empty);
        if (string.IsNullOrEmpty(text))
        {
            return true;
        }

        var hasPercentSign = text.EndsWith('%');
        text = text.TrimEnd('%').Replace(',', '.');
        if (!decimal.TryParse(text, NumberStyles.Number, CultureInfo.InvariantCulture, out var value))
        {
            error = "Kết quả thực hiện không hợp lệ (nhập 0–100).";
            return false;
        }

        percent = !hasPercentSign && value is > 0 and < 1 ? value * 100 : value;
        return true;
    }

    /// <summary>GPLV: "Có" / "Không" / trống; nhận "co", "CÓ", "x", "Đã có GPLV", "ko", "chưa có"…</summary>
    public static bool TryParseWorkPermit(string? raw, out string? value)
    {
        value = null;
        var key = TextNormalizer.ToKey(raw);
        if (key.Length == 0)
        {
            return true;
        }

        if (key is "k" or "ko" or "no" or "n" or "-" || key.StartsWith("khong") || key.StartsWith("chua"))
        {
            value = WorkPermitValues.No;
            return true;
        }

        if (key is "c" or "x" or "yes" or "y" or "v" || key.StartsWith("co") || key.StartsWith("da co"))
        {
            value = WorkPermitValues.Yes;
            return true;
        }

        return false;
    }

    /// <summary>Tách tên người thực hiện theo dấu phẩy / chấm phẩy / xuống dòng / dấu +.</summary>
    public static IReadOnlyList<string> SplitWorkers(string? raw) =>
        string.IsNullOrWhiteSpace(raw)
            ? []
            : raw.Split(WorkerSeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(x => x.Length > 0)
                .ToList();

    private static bool TryCreate(int year, int month, int day, out DateOnly date)
    {
        date = default;
        if (year is < 2000 or > 2100 || month is < 1 or > 12 || day < 1 || day > DateTime.DaysInMonth(year, month))
        {
            return false;
        }

        date = new DateOnly(year, month, day);
        return true;
    }
}
