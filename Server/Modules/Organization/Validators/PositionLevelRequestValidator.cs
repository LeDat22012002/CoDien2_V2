using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Shared.Extensions;

namespace Server.Modules.Organization.Validators;

public static class PositionLevelRequestValidator
{
    public const byte MinRow = 1;
    public const byte MaxRow = 6;

    public static void Validate(UpdatePositionLevelRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Tên cấp bậc không được để trống."];
        }
        else if (request.Name.Length > 100)
        {
            errors["name"] = ["Tên cấp bậc tối đa 100 ký tự."];
        }

        if (request.Rank is < 1 or > 999)
        {
            errors["rank"] = ["Thứ tự cấp bậc từ 1 đến 999."];
        }

        if (request.ChartRow is < MinRow or > MaxRow)
        {
            errors["chartRow"] = [$"Hàng hiển thị phải từ {MinRow} đến {MaxRow}."];
        }

        if (!DisplayModes.All.Contains(request.DisplayMode))
        {
            errors["displayMode"] = ["Kiểu hiển thị phải là CARD hoặc BLOCK."];
        }

        if (request.BlockLabel?.Length > 50)
        {
            errors["blockLabel"] = ["Tên khối tối đa 50 ký tự."];
        }

        errors.ThrowIfInvalid();
    }
}
