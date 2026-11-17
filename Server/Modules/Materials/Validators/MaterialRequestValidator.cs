using Server.Modules.Materials.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Materials.Validators;

/// <summary>Độ dài theo cột của bảng dbo.Material; lỗi thì ném ValidationException (key camelCase).</summary>
public static class MaterialRequestValidator
{
    public const int CodeMaxLength = 200;
    public const int DescriptionMaxLength = 500;
    public const int BasicDataTextMaxLength = 500;
    public const int PlantMaxLength = 100;
    public const int MaterialGroupMaxLength = 200;
    public const int ClassMaxLength = 200;
    public const int LevelMaxLength = 4000;
    public const int MaterialLevelMaxLength = 100;
    public const int DocumentNoMaxLength = 200;
    public const int TypeOfSuppliesMaxLength = 50;
    public const int UomMaxLength = 200;

    public static void Validate(MaterialRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mã vật tư không được để trống."];
        }

        CheckLength(errors, "code", "Mã vật tư", request.Code, CodeMaxLength);
        CheckLength(errors, "description", "Tên vật tư", request.Description, DescriptionMaxLength);
        CheckLength(errors, "basicDataText", "Basic data text", request.BasicDataText, BasicDataTextMaxLength);
        CheckLength(errors, "plant", "Plant", request.Plant, PlantMaxLength);
        CheckLength(errors, "materialGroup", "Nhóm vật tư", request.MaterialGroup, MaterialGroupMaxLength);
        CheckLength(errors, "class", "Class", request.Class, ClassMaxLength);
        CheckLength(errors, "level", "Level", request.Level, LevelMaxLength);
        CheckLength(errors, "materialLevel", "Cấp vật tư", request.MaterialLevel, MaterialLevelMaxLength);
        CheckLength(errors, "documentNo", "Số tài liệu", request.DocumentNo, DocumentNoMaxLength);
        CheckLength(errors, "typeOfSupplies", "Loại vật tư", request.TypeOfSupplies, TypeOfSuppliesMaxLength);
        CheckLength(errors, "uom", "Đơn vị tính", request.Uom, UomMaxLength);

        errors.ThrowIfInvalid();
    }

    private static void CheckLength(
        Dictionary<string, string[]> errors, string key, string label, string? value, int maxLength)
    {
        if (value?.Length > maxLength && !errors.ContainsKey(key))
        {
            errors[key] = [$"{label} tối đa {maxLength} ký tự."];
        }
    }
}