using Server.Modules.Documents.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Documents.Validators;

public static class DocumentTemplateRequestValidator
{
    public static void Validate(DocumentTemplateRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, "code", request.Code, 50, "Mã biểu mẫu");
        AddRequired(errors, "name", request.Name, 255, "Tên biểu mẫu");
        AddRequired(errors, "numberSuffix", request.NumberSuffix, 100, "Đuôi số cố định");

        if (request.Description?.Length > 500)
        {
            errors["description"] = ["Mô tả tối đa 500 ký tự."];
        }

        if (request.Process?.Length > 255)
        {
            errors["process"] = ["Quy trình tối đa 255 ký tự."];
        }

        if (request.StartNumber is < 0)
        {
            errors["startNumber"] = ["Số bắt đầu không được âm."];
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
