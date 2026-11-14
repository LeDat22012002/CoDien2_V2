using Server.Modules.WorkReports.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.WorkReports.Validators;

public static class MaterialPurposeRequestValidator
{
    public const int CodeMaxLength = 30;
    public const int NameMaxLength = 255;

    public static void Validate(MaterialPurposeRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mục đích không được để trống."];
        }
        else if (request.Code.Length > CodeMaxLength)
        {
            errors["code"] = [$"Mục đích tối đa {CodeMaxLength} ký tự."];
        }

        if (request.Name?.Length > NameMaxLength)
        {
            errors["name"] = [$"Diễn giải tối đa {NameMaxLength} ký tự."];
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["Thứ tự không được âm."];
        }

        errors.ThrowIfInvalid();
    }
}