using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Trạng thái 1 giai đoạn của form tại thời điểm tính; IsUnlocked = đã quá hạn nhưng đang được mở khóa (quyền work-reports.unlock).</summary>
public readonly record struct PhaseState(string Status, DateTime DeadlineAt, bool IsUnlocked = false)
{
    public bool IsOpen => Status == FormPhaseStatuses.Open;
}

/// <summary>
/// Quy tắc mở/khóa form (tính tại thời điểm gọi, không phụ thuộc tác vụ nền):
/// - Kế hoạch tuần W: mở từ khi tạo form tới hạn kế hoạch hiệu lực (hạn riêng xưởng → hạn chung).
/// - Báo cáo tuần W: mở từ 00:00 thứ 2 của tuần W tới hạn báo cáo hiệu lực.
/// - Đã quá hạn: khóa với mọi người; người có quyền unlock mở khóa (UnlockedUntil) thì mở lại tới thời điểm đó.
/// </summary>
public static class WeeklyFormRules
{
    public static PhaseState GetPlanState(WeeklyForm form, WorkWeek week, DateTime now)
    {
        var (deadline, _) = WorkWeekService.GetEffectiveDeadlines(week, form.WorkshopId);
        return Evaluate(null, deadline, form.PlanUnlockedUntil, now);
    }

    public static PhaseState GetReportState(WeeklyForm form, WorkWeek week, DateTime now)
    {
        var (_, deadline) = WorkWeekService.GetEffectiveDeadlines(week, form.WorkshopId);
        return Evaluate(week.StartDate.ToDateTime(TimeOnly.MinValue), deadline, form.ReportUnlockedUntil, now);
    }

    public static PhaseState GetState(WeeklyForm form, WorkWeek week, string phase, DateTime now) =>
        phase == WorkReportPhases.Plan ? GetPlanState(form, week, now) : GetReportState(form, week, now);

    /// <summary>Mã công việc: {Tiền tố}-{Hậu tố}-{STT:D2}.</summary>
    public static string BuildCode(string prefix, string suffix, int seq) => $"{prefix}-{suffix}-{seq:D2}";

    /// <summary>Nhãn La Mã I, II… cho thứ tự đơn vị trong xưởng.</summary>
    public static string ToRoman(int number)
    {
        if (number <= 0)
        {
            return string.Empty;
        }

        (int Value, string Symbol)[] map =
        [
            (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
            (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
        ];
        var result = string.Empty;
        foreach (var (value, symbol) in map)
        {
            while (number >= value)
            {
                result += symbol;
                number -= value;
            }
        }

        return result;
    }

    public static string BuildTitle(string phase, string workshopName, WorkWeek week)
    {
        var head = phase == WorkReportPhases.Plan ? "KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO" : "BÁO CÁO CÔNG VIỆC";
        return $"{head} – {workshopName} · Tuần {week.IsoWeek:D2} Tháng {week.LabelMonth:D2}/{week.LabelYear}";
    }

    private static PhaseState Evaluate(DateTime? openFrom, DateTime deadline, DateTime? unlockedUntil, DateTime now)
    {
        if (openFrom is { } start && now < start)
        {
            return new PhaseState(FormPhaseStatuses.NotStarted, deadline);
        }

        if (now <= deadline)
        {
            return new PhaseState(FormPhaseStatuses.Open, deadline);
        }

        return unlockedUntil is { } until && now <= until
            ? new PhaseState(FormPhaseStatuses.Open, until, IsUnlocked: true)
            : new PhaseState(FormPhaseStatuses.Locked, deadline);
    }
}
