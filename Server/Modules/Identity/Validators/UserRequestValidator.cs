using Server.Modules.Identity.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Validators;

public static class UserRequestValidator
{
    public static void Validate(CreateUserRequest request, AuthOptions.PasswordSettings passwordSettings)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.EmployeeId <= 0)
        {
            errors["employeeId"] = ["Vui lòng chọn nhân viên."];
        }

        PasswordValidator.Validate(errors, "password", request.Password, passwordSettings);

        errors.ThrowIfInvalid();
    }

    public static void Validate(ResetPasswordRequest request, AuthOptions.PasswordSettings passwordSettings)
    {
        var errors = new Dictionary<string, string[]>();
        PasswordValidator.Validate(errors, "newPassword", request.NewPassword, passwordSettings);
        errors.ThrowIfInvalid();
    }
}
