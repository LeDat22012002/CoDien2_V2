using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.Documents.Validators;

/// <summary>
/// Kiểm tra dữ liệu cấp số. Các trường ghép vào số hiệu (Số HĐ, Số PR, Nhà thầu…) là bắt buộc
/// để không sinh số hiệu thiếu phần (vd "01//BM-NM.CĐ2").
/// </summary>
public static class IssuedDocumentRequestValidator
{
    public static void Validate(IssueStandardDocumentRequest request) => ValidateCommon(request).ThrowIfInvalid();

    public static void Validate(IssueAcceptanceRecordRequest request)
    {
        var errors = ValidateCommon(request);
        AddRequired(errors, "contractNumber", request.ContractNumber, 60, "Số hợp đồng");
        AddRequired(errors, "shortName", request.ShortName, 40, "Tên viết tắt");
        errors.ThrowIfInvalid();
    }

    public static void Validate(IssueTechnicalConfirmationRequest request)
    {
        var errors = ValidateCommon(request);
        AddRequired(errors, "prNumber", request.PrNumber, 30, "Số PR");
        AddRequired(errors, "contractor", request.Contractor, 50, "Nhà thầu");
        errors.ThrowIfInvalid();
    }

    public static void Validate(IssueTechnicalPlanRequest request)
    {
        var errors = ValidateCommon(request);
        AddRequired(errors, "contractor", request.Contractor, 60, "Nhà thầu");
        errors.ThrowIfInvalid();
    }

    public static void Validate(IssueContractPaymentRequest request)
    {
        var errors = ValidateCommon(request);
        AddRequired(errors, "contractNumber", request.ContractNumber, 50, "Số hợp đồng");

        if (request.IsNew && request.Year is not (>= 2000 and <= 2100))
        {
            errors["year"] = ["Năm hợp đồng không hợp lệ."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateIssuedDocumentRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.Subject?.Length > 1000)
        {
            errors["subject"] = ["Nội dung trích yếu tối đa 1000 ký tự."];
        }

        if (request.Note?.Length > 500)
        {
            errors["note"] = ["Ghi chú tối đa 500 ký tự."];
        }

        if (request.PublishStatus is not null && !PublishStatuses.All.Contains(request.PublishStatus))
        {
            errors["publishStatus"] = [$"Trạng thái phải là một trong: {string.Join(", ", PublishStatuses.All)}."];
        }

        if (request.EOfficeLink?.Length > 1000)
        {
            errors["eOfficeLink"] = ["Đường dẫn eOffice tối đa 1000 ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    private static Dictionary<string, string[]> ValidateCommon(IssueDocumentRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.DocumentTemplateId <= 0)
        {
            errors["documentTemplateId"] = ["Vui lòng chọn biểu mẫu."];
        }

        if (request.IssueDate == default)
        {
            errors["issueDate"] = ["Ngày ban hành không được để trống."];
        }

        if (request.Subject?.Length > 1000)
        {
            errors["subject"] = ["Nội dung trích yếu tối đa 1000 ký tự."];
        }

        return errors;
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
