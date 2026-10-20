using Server.Modules.Identity.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Validators;

public static class PermissionRequestValidator
{
    public static void Validate(UpdatePermissionRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Tên quyền không được để trống."];
        }
        else if (request.Name.Length > 150)
        {
            errors["name"] = ["Tên quyền tối đa 150 ký tự."];
        }

        errors.ThrowIfInvalid();
    }
}
