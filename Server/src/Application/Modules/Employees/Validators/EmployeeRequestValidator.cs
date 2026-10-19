using System.Net.Mail;
using Server.Application.Common.Exceptions;
using Server.Application.Modules.Employees.DTOs;
using Server.Domain.Modules.Employees.Entities;

namespace Server.Application.Modules.Employees.Validators;

/// <summary>Kiểm tra dữ liệu đầu vào theo ràng buộc của bảng dbo.Employee; lỗi thì ném ValidationException.</summary>
public static class EmployeeRequestValidator
{
    public static void Validate(CreateEmployeeRequest request)
    {
        var errors = ValidateCommon(request);
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
}
