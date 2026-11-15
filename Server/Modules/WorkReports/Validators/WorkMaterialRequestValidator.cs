using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static class WorkMaterialRequestValidator
{
    public const int MaterialCodeMaxLength = 50;
    public const int MaterialNameMaxLength = 255;
    public const int UomMaxLength = 20;
    public const int NoteMaxLength = 500;
    public const decimal MaxQuantity = 1_000_000_000m;

    public static void Validate(WorkMaterialRequestBase request, WorkWeek week, bool isPlan)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.WorkItemId <= 0)
        {
            errors["workItemId"] = ["Vui lòng chọn mã công việc sử dụng vật tư."];
        }

        if (string.IsNullOrWhiteSpace(request.MaterialName))
        {
            errors["materialName"] = ["Tên vật tư không được để trống."];
        }
        else if (request.MaterialName.Length > MaterialNameMaxLength)
        {
            errors["materialName"] = [$"Tên vật tư tối đa {MaterialNameMaxLength} ký tự."];
        }

        if (request.MaterialCode?.Length > MaterialCodeMaxLength)
        {
            errors["materialCode"] = [$"Mã vật tư tối đa {MaterialCodeMaxLength} ký tự."];
        }

        if (request.Uom?.Length > UomMaxLength)
        {
            errors["uom"] = [$"Đơn vị tính tối đa {UomMaxLength} ký tự."];
        }

        if (isPlan)
        {
            CheckQuantity(errors, "plannedQuantity", request.PlannedQuantity, "Số lượng kế hoạch");
        }
        else
        {
            CheckQuantity(errors, "actualQuantity", request.ActualQuantity, "Số lượng thực tế");
        }

        if (request.UsageDate is { } usageDate && (usageDate < week.StartDate || usageDate > week.EndDate))
        {
            errors["usageDate"] = [$"Ngày sử dụng phải trong tuần {week.StartDate:dd/MM/yyyy} – {week.EndDate:dd/MM/yyyy}."];
        }

        if (request.Note?.Length > NoteMaxLength)
        {
            errors["note"] = [$"Ghi chú tối đa {NoteMaxLength} ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    private static void CheckQuantity(Dictionary<string, string[]> errors, string key, decimal? value, string label)
    {
        if (value is < 0 or > MaxQuantity)
        {
            errors[key] = [$"{label} không hợp lệ."];
        }
    }
}
