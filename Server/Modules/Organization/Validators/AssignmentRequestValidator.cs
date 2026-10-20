using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.Organization.Validators;

public static class AssignmentRequestValidator
{
    public static void Validate(ChangeAssignmentRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, "empCode", request.EmpCode, 20, "Mã nhân viên");
        AddRequired(errors, "newOrgUnitCode", request.NewOrgUnitCode, 50, "Đơn vị");
        AddRequired(errors, "newLevelCode", request.NewLevelCode, 10, "Cấp bậc");

        if (request.EffectiveDate == default)
        {
            errors["effectiveDate"] = ["Ngày hiệu lực không được để trống."];
        }

        if (!AssignmentChangeTypes.AllowedForChange.Contains(request.ChangeType))
        {
            errors["changeType"] =
                [$"Loại thay đổi phải là một trong: {string.Join(", ", AssignmentChangeTypes.AllowedForChange)}."];
        }

        if (request.JobTitle?.Length > 255)
        {
            errors["jobTitle"] = ["Chức danh tối đa 255 ký tự."];
        }

        if (request.DecisionNo?.Length > 100)
        {
            errors["decisionNo"] = ["Số quyết định tối đa 100 ký tự."];
        }

        if (request.Note?.Length > 500)
        {
            errors["note"] = ["Ghi chú tối đa 500 ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(EndAssignmentRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.EndDate == default)
        {
            errors["endDate"] = ["Ngày kết thúc không được để trống."];
        }

        if (request.Note?.Length > 500)
        {
            errors["note"] = ["Ghi chú tối đa 500 ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    private static void AddRequired(
        Dictionary<string, string[]> errors, string key, string? value, int maxLength, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} không được để trống."];
        }
        else if (value.Length > maxLength)
        {
            errors[key] = [$"{label} tối đa {maxLength} ký tự."];
        }
    }
}
