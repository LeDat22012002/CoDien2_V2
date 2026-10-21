using Server.Modules.Equipments.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Equipments.Validators;

public static class EquipmentRequestValidator
{
    public const int CodeMaxLength = 50;
    public const int NameMaxLength = 255;

    public static void Validate(EquipmentRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mã thiết bị không được để trống."];
        }
        else if (request.Code.Length > CodeMaxLength)
        {
            errors["code"] = [$"Mã thiết bị tối đa {CodeMaxLength} ký tự."];
        }

        if (request.Name?.Length > NameMaxLength)
        {
            errors["name"] = [$"Tên thiết bị tối đa {NameMaxLength} ký tự."];
        }

        errors.ThrowIfInvalid();
    }
}
