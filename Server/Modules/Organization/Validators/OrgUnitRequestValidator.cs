using Server.Modules.Organization.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Organization.Validators;

/// <summary>Kiểm tra theo ràng buộc của bảng dbo.OrgUnit.</summary>
public static class OrgUnitRequestValidator
{
    public static void Validate(CreateOrgUnitRequest request)
    {
        var errors = ValidateCommon(request);

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            errors["code"] = ["Mã đơn vị không được để trống."];
        }
        else if (request.Code.Length > 50)
        {
            errors["code"] = ["Mã đơn vị tối đa 50 ký tự."];
        }

        if (string.IsNullOrWhiteSpace(request.TypeCode))
        {
            errors["typeCode"] = ["Vui lòng chọn loại đơn vị."];
        }

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateOrgUnitRequest request) => ValidateCommon(request).ThrowIfInvalid();

    public static void Validate(ReorderOrgUnitsRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.OrderedIds.Count == 0)
        {
            errors["orderedIds"] = ["Danh sách sắp xếp không được để trống."];
        }
        else if (request.OrderedIds.Distinct().Count() != request.OrderedIds.Count)
        {
            errors["orderedIds"] = ["Danh sách sắp xếp bị trùng đơn vị."];
        }

        errors.ThrowIfInvalid();
    }

    private static Dictionary<string, string[]> ValidateCommon(OrgUnitRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Tên đơn vị không được để trống."];
        }
        else if (request.Name.Length > 255)
        {
            errors["name"] = ["Tên đơn vị tối đa 255 ký tự."];
        }

        AddMaxLength(errors, "shortName", request.ShortName, 100, "Tên viết tắt");
        AddMaxLength(errors, "headLevelCode", request.HeadLevelCode, 10, "Mã cấp trưởng");
        AddMaxLength(errors, "disciplineCode", request.DisciplineCode, 10, "Mã chuyên môn");
        AddMaxLength(errors, "area", request.Area, 255, "Khu vực");
        AddMaxLength(errors, "shift", request.Shift, 5, "Ca");
        AddMaxLength(errors, "note", request.Note, 500, "Ghi chú");

        return errors;
    }

    private static void AddMaxLength(
        Dictionary<string, string[]> errors, string key, string? value, int maxLength, string label)
    {
        if (value?.Length > maxLength)
        {
            errors[key] = [$"{label} tối đa {maxLength} ký tự."];
        }
    }
}
