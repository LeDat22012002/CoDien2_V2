using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

/// <summary>Kiểm tra dữ liệu 1 dòng kế hoạch / báo cáo (đã chuẩn hóa ở Service).</summary>
public static class WorkItemRequestValidator
{
    public const int DescriptionMaxLength = 1000;
    public const int EquipmentCodeMaxLength = 50;
    public const int EquipmentNameMaxLength = 255;
    public const int WorkerNameMaxLength = 100;
    public const int MaxWorkers = 50;
    public const int FiveSMaxLength = 255;
    public const int ExplanationMaxLength = 1000;
    public const int NoteMaxLength = 500;

    /// <summary>Giờ công tối đa 1 dòng (phút) để chặn gõ nhầm: 50 người × 7 ngày × 24 giờ.</summary>
    public const decimal MaxMinutes = 504000m;

    public static void ValidatePlan(PlanItemRequest request, WorkWeek week)
    {
        var errors = CollectCommon(request, week);
        CheckMinutes(errors, "plannedMinutes", request.PlannedMinutes, "Giờ công kế hoạch", required: true);
        errors.ThrowIfInvalid();
    }

    /// <param name="isUnplanned">Dòng thêm ở báo cáo: bắt buộc tự điền giờ công kế hoạch.</param>
    public static void ValidateReport(ReportItemRequest request, WorkWeek week, bool isUnplanned)
    {
        var errors = CollectCommon(request, week);
        if (isUnplanned)
        {
            CheckMinutes(errors, "plannedMinutes", request.PlannedMinutes, "Giờ công kế hoạch", required: true);
        }

        CheckMinutes(errors, "actualMinutes", request.ActualMinutes, "Giờ công thực tế", required: false);

        if (request.ResultPercent is < 0 or > 100)
        {
            errors["resultPercent"] = ["Kết quả thực hiện từ 0 đến 100%."];
        }

        if (request.WorkPermit is not null && !WorkPermitValues.All.Contains(request.WorkPermit))
        {
            errors["workPermit"] = ["GPLV chỉ nhận Có / Không hoặc để trống."];
        }

        if (request.FiveS?.Length > FiveSMaxLength)
        {
            errors["fiveS"] = [$"5S tối đa {FiveSMaxLength} ký tự."];
        }

        if (request.Explanation?.Length > ExplanationMaxLength)
        {
            errors["explanation"] = [$"Diễn giải tối đa {ExplanationMaxLength} ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    private static Dictionary<string, string[]> CollectCommon(WorkItemRequestBase request, WorkWeek week)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.WorkCategoryId <= 0)
        {
            errors["workCategoryId"] = ["Vui lòng chọn công việc thực hiện (đầu mục)."];
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            errors["description"] = ["Hạng mục công việc không được để trống."];
        }
        else if (request.Description.Length > DescriptionMaxLength)
        {
            errors["description"] = [$"Hạng mục công việc tối đa {DescriptionMaxLength} ký tự."];
        }

        var weekRange = $"{week.StartDate:dd/MM/yyyy} – {week.EndDate:dd/MM/yyyy}";
        if (request.StartDate is not { } startDate)
        {
            errors["startDate"] = ["Vui lòng nhập ngày bắt đầu."];
        }
        else if (startDate < week.StartDate || startDate > week.EndDate)
        {
            errors["startDate"] = [$"Ngày bắt đầu phải trong tuần {weekRange}."];
        }
        else if (request.EndDate is { } endDate)
        {
            if (endDate < startDate)
            {
                errors["endDate"] = ["Ngày kết thúc không được trước ngày bắt đầu."];
            }
            else if (endDate > week.EndDate)
            {
                errors["endDate"] = [$"Ngày kết thúc phải trong tuần {weekRange}."];
            }
        }

        if (request.EquipmentCode?.Length > EquipmentCodeMaxLength)
        {
            errors["equipmentCode"] = [$"Mã thiết bị tối đa {EquipmentCodeMaxLength} ký tự."];
        }

        if (request.EquipmentName?.Length > EquipmentNameMaxLength)
        {
            errors["equipmentName"] = [$"Tên thiết bị tối đa {EquipmentNameMaxLength} ký tự."];
        }

        var workers = request.Workers ?? [];
        if (workers.Count > MaxWorkers)
        {
            errors["workers"] = [$"Tối đa {MaxWorkers} người thực hiện."];
        }
        else if (workers.Any(x => x.EmployeeId is null && string.IsNullOrWhiteSpace(x.DisplayName)))
        {
            errors["workers"] = ["Tên người thực hiện không được để trống."];
        }
        else if (workers.Any(x => x.DisplayName?.Length > WorkerNameMaxLength))
        {
            errors["workers"] = [$"Tên người thực hiện tối đa {WorkerNameMaxLength} ký tự."];
        }

        if (request.Note?.Length > NoteMaxLength)
        {
            errors["note"] = [$"Ghi chú tối đa {NoteMaxLength} ký tự."];
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["Thứ tự không được âm."];
        }

        return errors;
    }

    private static void CheckMinutes(
        Dictionary<string, string[]> errors, string key, decimal? value, string label, bool required)
    {
        if (value is null)
        {
            if (required)
            {
                errors[key] = [$"Vui lòng nhập {label.ToLowerInvariant()} (phút)."];
            }
        }
        else if (value < 0 || value > MaxMinutes)
        {
            errors[key] = [$"{label} phải từ 0 đến {MaxMinutes:N0} phút."];
        }
    }
}
