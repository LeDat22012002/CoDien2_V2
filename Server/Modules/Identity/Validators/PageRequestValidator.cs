using System.Text.RegularExpressions;
using Server.Modules.Identity.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Identity.Validators;

public static partial class PageRequestValidator
{
    public static void Validate(PageRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mã trang không được để trống."];
        }
        else if (request.Code.Length > 50 || !PageCodeRegex().IsMatch(request.Code))
        {
            errors["code"] = ["Mã trang tối đa 50 ký tự, chỉ gồm chữ thường không dấu, số và '-' (vd goods-receipts)."];
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Tiêu đề không được để trống."];
        }
        else if (request.Title.Length > 100)
        {
            errors["title"] = ["Tiêu đề tối đa 100 ký tự."];
        }

        if (request.Path is not null)
        {
            if (request.Path.Length > 200 || !PathRegex().IsMatch(request.Path))
            {
                errors["path"] = ["Đường dẫn tối đa 200 ký tự, bắt đầu bằng '/', chỉ gồm chữ không dấu, số, '-', '_', '/', ':' (vd /employees/:id)."];
            }
        }
        else if (request.PermissionId is not null)
        {
            errors["permissionId"] = ["Nút nhóm menu (không có đường dẫn) không gắn quyền; quyền đặt ở các trang con."];
        }

        if (request.Icon?.Length > 50)
        {
            errors["icon"] = ["Tên icon tối đa 50 ký tự."];
        }

        errors.ThrowIfInvalid();
    }

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex PageCodeRegex();

    [GeneratedRegex("^/[A-Za-z0-9/_:\\-]*$")]
    private static partial Regex PathRegex();
}
