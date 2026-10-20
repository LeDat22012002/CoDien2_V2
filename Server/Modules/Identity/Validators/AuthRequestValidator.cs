using Server.Modules.Identity.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Validators;

public static class AuthRequestValidator
{
    public static void Validate(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.EmpCode))
        {
            errors["empCode"] = ["Mã nhân viên không được để trống."];
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            errors["password"] = ["Mật khẩu không được để trống."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(ChangePasswordRequest request, AuthOptions.PasswordSettings passwordSettings)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrEmpty(request.CurrentPassword))
        {
            errors["currentPassword"] = ["Mật khẩu hiện tại không được để trống."];
        }

        PasswordValidator.Validate(errors, "newPassword", request.NewPassword, passwordSettings);

        if (!errors.ContainsKey("newPassword") && request.NewPassword == request.CurrentPassword)
        {
            errors["newPassword"] = ["Mật khẩu mới phải khác mật khẩu hiện tại."];
        }

        errors.ThrowIfInvalid();
    }
}
