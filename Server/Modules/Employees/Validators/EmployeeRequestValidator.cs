using System.Net.Mail;
using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Entities;
using Server.Shared.Exceptions;

namespace Server.Modules.Employees.Validators;

/// <summary>Kiểm tra dữ liệu đầu vào theo ràng buộc của bảng dbo.Employee; lỗi thì ném ValidationException.</summary>
public static class EmployeeRequestValidator
{
    private const long MaxAvatarBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AvatarExtensions =
        new([".png", ".jpg", ".jpeg", ".webp", ".gif"], StringComparer.OrdinalIgnoreCase);

    public static void Validate(CreateEmployeeRequest request)
    {
        var errors = ValidateCommon(request);

        // Key lỗi phẳng, trùng tên ô nhập vị trí trên form tạo nhân viên
        if (request.InitialAssignment is { } assignment)
        {
            if (string.IsNullOrWhiteSpace(assignment.OrgUnitCode))
            {
                errors["orgUnitCode"] = ["Đơn vị không được để trống."];
            }

            if (string.IsNullOrWhiteSpace(assignment.LevelCode))
            {
                errors["levelCode"] = ["Cấp bậc không được để trống."];
            }

            if (assignment.JobTitle?.Length > 255)
            {
                errors["jobTitle"] = ["Chức danh tối đa 255 ký tự."];
            }

            if (assignment.DecisionNo?.Length > 100)
            {
                errors["decisionNo"] = ["Số quyết định tối đa 100 ký tự."];
            }

            if (assignment.Note?.Length > 500)
            {
                errors["note"] = ["Ghi chú tối đa 500 ký tự."];
            }
        }

        ThrowIfInvalid(errors);
    }

    public static void Validate(UpdateEmployeeRequest request)
    {
        var errors = ValidateCommon(request);

        if (!EmployeeStatus.All.Contains(request.Status))
        {
            errors["status"] = [$"Trạng thái phải là một trong: {string.Join(", ", EmployeeStatus.All)}."];
        }

        ThrowIfInvalid(errors);
    }

    private static Dictionary<string, string[]> ValidateCommon(EmployeeRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.EmpCode))
        {
            errors["empCode"] = ["Mã nhân viên không được để trống."];
        }
        else if (request.EmpCode.Length > 20)
        {
            errors["empCode"] = ["Mã nhân viên tối đa 20 ký tự."];
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors["fullName"] = ["Họ tên không được để trống."];
        }
        else if (request.FullName.Length > 150)
        {
            errors["fullName"] = ["Họ tên tối đa 150 ký tự."];
        }

        if (request.BirthDate is { } birthDate && birthDate > DateOnly.FromDateTime(DateTime.Today))
        {
            errors["birthDate"] = ["Ngày sinh không được lớn hơn ngày hiện tại."];
        }

        if (request.EducationLevel is not null && !EducationLevel.All.Contains(request.EducationLevel))
        {
            errors["educationLevel"] = [$"Trình độ phải là một trong: {string.Join(", ", EducationLevel.All)}."];
        }

        if (request.Major?.Length > 255)
        {
            errors["major"] = ["Chuyên ngành tối đa 255 ký tự."];
        }

        if (request.Gender is not null && !Gender.All.Contains(request.Gender))
        {
            errors["gender"] = [$"Giới tính phải là một trong: {string.Join(", ", Gender.All)}."];
        }

        if (request.Email is not null)
        {
            if (request.Email.Length > 150)
            {
                errors["email"] = ["Email tối đa 150 ký tự."];
            }
            else if (!MailAddress.TryCreate(request.Email, out _))
            {
                errors["email"] = ["Email không đúng định dạng."];
            }
        }

        if (request.Phone?.Length > 20)
        {
            errors["phone"] = ["Số điện thoại tối đa 20 ký tự."];
        }

        if (request.AvatarUrl?.Length > 500)
        {
            errors["avatarUrl"] = ["Đường dẫn ảnh tối đa 500 ký tự."];
        }

        return errors;
    }

    private static void ThrowIfInvalid(Dictionary<string, string[]> errors)
    {
        if (errors.Count > 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", errors);
        }
    }

    public static void ValidateAvatar(IFormFile? file)
    {
        var errors = new Dictionary<string, string[]>();

        if (file is null || file.Length == 0)
        {
            errors["file"] = ["Vui lòng chọn ảnh."];
        }
        else if (!AvatarExtensions.Contains(Path.GetExtension(file.FileName))
                 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            errors["file"] = ["Chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF."];
        }
        else if (file.Length > MaxAvatarBytes)
        {
            errors["file"] = ["Ảnh tối đa 5MB."];
        }

        ThrowIfInvalid(errors);
    }
}
