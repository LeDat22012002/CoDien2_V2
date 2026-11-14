using System.Globalization;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Quy tắc tuần: thứ 2 → Chủ nhật, số tuần theo ISO; nhãn tháng/năm theo ngày thứ 2 (tuần vắt tháng tính về tháng trước).
/// Hạn báo cáo tuần N = T2(N) + DeadlineDayOffset ngày, lúc DeadlineTime; hạn kế hoạch tuần N = hạn báo cáo tuần N−1.
/// </summary>
public static class WorkWeekCalculator
{
    public static DateOnly GetMonday(DateOnly date) => date.AddDays(-(((int)date.DayOfWeek + 6) % 7));

    public static (int Year, int Week) GetIsoWeek(DateOnly monday)
    {
        var dateTime = monday.ToDateTime(TimeOnly.MinValue);
        return (ISOWeek.GetYear(dateTime), ISOWeek.GetWeekOfYear(dateTime));
    }

    public static DateTime GetReportDeadline(DateOnly monday, WorkReportSetting setting) =>
        monday.AddDays(setting.DeadlineDayOffset).ToDateTime(setting.DeadlineTime);

    public static DateTime GetPlanDeadline(DateOnly monday, WorkReportSetting setting) =>
        monday.AddDays(setting.DeadlineDayOffset - 7).ToDateTime(setting.DeadlineTime);

    public static WorkWeek Create(DateOnly monday, WorkReportSetting setting)
    {
        var (isoYear, isoWeek) = GetIsoWeek(monday);
        return new WorkWeek
        {
            IsoYear = isoYear,
            IsoWeek = isoWeek,
            StartDate = monday,
            EndDate = monday.AddDays(6),
            LabelMonth = monday.Month,
            LabelYear = monday.Year,
            PlanDeadlineAt = GetPlanDeadline(monday, setting),
            ReportDeadlineAt = GetReportDeadline(monday, setting),
        };
    }

    /// <summary>"Tuần 46 · Tháng 11/2026 · 09/11–15/11"; năm ISO khác năm của tháng thì ghi rõ "Tuần 01/2026 · Tháng 12/2025".</summary>
    public static string BuildLabel(WorkWeek week)
    {
        var weekPart = week.IsoYear == week.LabelYear
            ? $"Tuần {week.IsoWeek:D2}"
            : $"Tuần {week.IsoWeek:D2}/{week.IsoYear}";
        var start = week.StartDate.ToString("dd'/'MM", CultureInfo.InvariantCulture);
        var end = week.EndDate.ToString("dd'/'MM", CultureInfo.InvariantCulture);
        return $"{weekPart} · Tháng {week.LabelMonth:D2}/{week.LabelYear} · {start}–{end}";
    }

    /// <summary>Mô tả hạn theo cấu hình, vd "Thứ 2 tuần sau, 11:00".</summary>
    public static string DescribeDeadline(WorkReportSetting setting)
    {
        var dayIndex = setting.DeadlineDayOffset % 7;
        string[] dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
        var weekPart = setting.DeadlineDayOffset >= 7 ? "tuần sau" : "cùng tuần";
        var time = setting.DeadlineTime.ToString("HH':'mm", CultureInfo.InvariantCulture);
        return $"Báo cáo tuần N và kế hoạch tuần N+1 khóa cùng lúc: {dayNames[dayIndex]} {weekPart}, {time}";
    }
}