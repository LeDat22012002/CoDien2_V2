using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

/// <summary>Kiểm tra dữ liệu 1 dòng công việc theo giai đoạn (đã chuẩn hóa ở Service).</summary>
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

    /// <param name="isPlan">Đang ghi giai đoạn kế hoạch.</param>
    /// <param name="isUnplanned">Dòng phát sinh (chỉ có ở báo cáo).</param>
    /// <param name="categoryEditable">Có nhận đầu mục (kế hoạch, hoặc dòng phát sinh).</param>
    public static Dictionary<string, string[]> Collect(
        WorkItemRequestBase request, WorkWeek week, bool isPlan, bool isUnplanned, bool categoryEditable)
    {
        var errors = new Dictionary<string, string[]>();

        if (categoryEditable && request.WorkCategoryId <= 0)
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

        if (request.WorkDate is not { } workDate)
        {
            errors["workDate"] = ["Vui lòng nhập ngày thực hiện."];
        }
        else if (workDate < week.StartDate || workDate > week.EndDate)
        {
            errors["workDate"] = [$"Ngày thực hiện phải trong tuần {week.StartDate:dd/MM/yyyy} – {week.EndDate:dd/MM/yyyy}."];
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

        if (isPlan)
        {
            CheckMinutes(errors, "plannedMinutes", request.PlannedMinutes, "Giờ công kế hoạch", required: true);
        }
        else
        {
            CheckMinutes(errors, "actualMinutes", request.ActualMinutes, "Giờ công thực tế", required: isUnplanned);

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

    public static void Validate(
        WorkItemRequestBase request, WorkWeek week, bool isPlan, bool isUnplanned, bool categoryEditable) =>
        Collect(request, week, isPlan, isUnplanned, categoryEditable).ThrowIfInvalid();

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
