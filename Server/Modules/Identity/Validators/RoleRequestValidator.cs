using System.Text.RegularExpressions;
using Server.Modules.Identity.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Validators;

public static partial class RoleRequestValidator
{
    public static void Validate(CreateRoleRequest request)
    {
        var errors = ValidateCommon(request);

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mã vai trò không được để trống."];
        }
        else if (!RoleCodeRegex().IsMatch(request.Code))
        {
            errors["code"] = ["Mã vai trò 2–50 ký tự, chỉ gồm chữ in hoa không dấu, số và '_', bắt đầu bằng chữ (vd HR_STAFF)."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateRoleRequest request)
    {
        ValidateCommon(request).ThrowIfInvalid();
    }

    private static Dictionary<string, string[]> ValidateCommon(RoleRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Tên vai trò không được để trống."];
        }
        else if (request.Name.Length > 100)
        {
            errors["name"] = ["Tên vai trò tối đa 100 ký tự."];
        }

        if (request.Description?.Length > 500)
        {
            errors["description"] = ["Mô tả tối đa 500 ký tự."];
        }

        return errors;
    }

    [GeneratedRegex("^[A-Z][A-Z0-9_]{1,49}$")]
    private static partial Regex RoleCodeRegex();
}
