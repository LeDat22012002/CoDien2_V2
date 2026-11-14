using System.Text.RegularExpressions;
using Server.Modules.WorkReports.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static partial class WorkCategoryRequestValidator
{
    public const int CodeMaxLength = 30;
    public const int GroupLetterMaxLength = 5;
    public const int NameMaxLength = 100;
    public const int CodeSuffixMaxLength = 10;

    /// <summary>Hậu tố nằm trong mã công việc: chữ (kể cả tiếng Việt), số, chấm.</summary>
    [GeneratedRegex(@"^[\p{L}\p{N}.]+$")]
    private static partial Regex CodeSuffixRegex();

    public static void Validate(WorkCategoryRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        Required(errors, "code", request.Code, "Giá trị dropdown", CodeMaxLength);
        Required(errors, "groupLetter", request.GroupLetter, "Ký hiệu nhóm", GroupLetterMaxLength);
        Required(errors, "name", request.Name, "Tên đầu mục", NameMaxLength);

        if (Required(errors, "codeSuffix", request.CodeSuffix, "Hậu tố mã", CodeSuffixMaxLength)
            && !CodeSuffixRegex().IsMatch(request.CodeSuffix))
        {
            errors["codeSuffix"] = ["Hậu tố mã chỉ gồm chữ, số hoặc dấu chấm (không có khoảng trắng, dấu gạch)."];
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["Thứ tự không được âm."];
        }

        errors.ThrowIfInvalid();
    }

    /// <summary>True khi có giá trị và không quá dài.</summary>
    private static bool Required(
        Dictionary<string, string[]> errors, string key, string? value, string label, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} không được để trống."];
            return false;
        }

        if (value.Length > maxLength)
        {
            errors[key] = [$"{label} tối đa {maxLength} ký tự."];
            return false;
        }

        return true;
    }
}