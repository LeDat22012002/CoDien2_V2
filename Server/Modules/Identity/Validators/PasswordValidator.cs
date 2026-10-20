namespace Server.Modules.Identity.Validators;

/// <summary>Quy tắc độ mạnh mật khẩu, cấu hình tại Identity:Password.</summary>
public static class PasswordValidator
{
    public static void Validate(
        Dictionary<string, string[]> errors, string key, string? password, AuthOptions.PasswordSettings settings)
    {
        if (string.IsNullOrEmpty(password))
        {
            errors[key] = ["Mật khẩu không được để trống."];
            return;
        }

        var messages = new List<string>();
        if (password.Length < settings.MinLength)
        {
            messages.Add($"Mật khẩu tối thiểu {settings.MinLength} ký tự.");
        }

        if (password.Length > 128)
        {
            messages.Add("Mật khẩu tối đa 128 ký tự.");
        }

        if (settings.RequireLetter && !password.Any(char.IsLetter))
        {
            messages.Add("Mật khẩu phải có ít nhất 1 chữ cái.");
        }

        if (settings.RequireDigit && !password.Any(char.IsDigit))
        {
            messages.Add("Mật khẩu phải có ít nhất 1 chữ số.");
        }

        if (messages.Count > 0)
        {
            errors[key] = [.. messages];
        }
    }
}
