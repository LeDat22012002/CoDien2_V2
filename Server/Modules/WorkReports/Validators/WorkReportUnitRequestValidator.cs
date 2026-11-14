using System.Text.RegularExpressions;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Shared.Exceptions;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static partial class WorkReportUnitRequestValidator
{
    public const int DisplayNameMaxLength = 255;
    public const int CodePrefixMaxLength = 20;

    /// <summary>Tiền tố nằm đầu mã công việc: chữ (kể cả "Đ"), số, chấm, gạch ngang. Vd C-TBMP, Đ-NHLB1, CĐ-K.A, TCDKB.</summary>
    [GeneratedRegex(@"^[\p{L}\p{N}.\-]+$")]
    private static partial Regex CodePrefixRegex();

    public static void Validate(WorkReportUnitRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.DisplayName?.Length > DisplayNameMaxLength)
        {
            errors["displayName"] = [$"Tên hiển thị tối đa {DisplayNameMaxLength} ký tự."];
        }

        if (string.IsNullOrWhiteSpace(request.CodePrefix))
        {
            errors["codePrefix"] = ["Tiền tố mã công việc không được để trống."];
        }
        else if (request.CodePrefix.Length > CodePrefixMaxLength)
        {
            errors["codePrefix"] = [$"Tiền tố mã công việc tối đa {CodePrefixMaxLength} ký tự."];
        }
        else if (!CodePrefixRegex().IsMatch(request.CodePrefix))
        {
            errors["codePrefix"] = ["Tiền tố chỉ gồm chữ, số, dấu chấm hoặc gạch ngang (không có khoảng trắng)."];
        }

        if (!LaborTypes.All.Contains(request.LaborType))
        {
            errors["laborType"] = ["Loại giờ công phải là HC (hành chính) hoặc KIP (theo ca)."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(CreateWorkReportUnitRequest request)
    {
        if (request.OrgUnitId <= 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["orgUnitId"] = ["Vui lòng chọn tổ/kíp."],
            });
        }

        Validate((WorkReportUnitRequestBase)request);
    }
}