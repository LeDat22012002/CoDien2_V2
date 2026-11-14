using Server.Modules.WorkReports.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static class WorkReportSettingRequestValidator
{
    /// <summary>Số phút của 1 tuần (7 × 24 × 60).</summary>
    private const decimal MinutesPerWeek = 10080m;

    public static void Validate(UpdateWorkReportSettingRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.HcMinutesPerWeek is <= 0 or > MinutesPerWeek)
        {
            errors["hcMinutesPerWeek"] = [$"Giờ công hiệu dụng HC phải lớn hơn 0 và không quá {MinutesPerWeek:0} phút."];
        }

        if (request.ShiftMinutesPerWeek is <= 0 or > MinutesPerWeek)
        {
            errors["shiftMinutesPerWeek"] =
                [$"Giờ công hiệu dụng kíp phải lớn hơn 0 và không quá {MinutesPerWeek:0} phút."];
        }

        // 0 = thứ 2 cùng tuần … 13 = Chủ nhật tuần sau
        if (request.DeadlineDayOffset is < 0 or > 13)
        {
            errors["deadlineDayOffset"] = ["Ngày hạn phải trong khoảng từ thứ 2 cùng tuần đến Chủ nhật tuần sau."];
        }

        if (request.WarnDaysBefore is < 0 or > 6)
        {
            errors["warnDaysBefore"] = ["Số ngày cảnh báo trước hạn từ 0 đến 6."];
        }

        errors.ThrowIfInvalid();
    }
}