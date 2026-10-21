using Server.Data;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.Organization.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Extensions;

namespace Server.Modules.Organization.Services;

public class OrgUnitService(IOrgUnitRepository orgUnitRepository, IUnitOfWork unitOfWork) : IOrgUnitService
{
    private const string UnitNotFoundMessage = "Không tìm thấy đơn vị.";

    public async Task<IReadOnlyList<OrgUnitDto>> GetListAsync(
        OrgUnitFilterRequest filter, CancellationToken cancellationToken) =>
        (await orgUnitRepository.GetListAsync(filter, cancellationToken)).Select(ToDto).ToList();

    public async Task<OrgUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var orgUnit = await orgUnitRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(UnitNotFoundMessage);

        return ToDto(orgUnit);
    }

    public async Task<IReadOnlyList<OrgUnitDto>> GetTopLevelUnitsAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        (await orgUnitRepository.GetTopLevelUnitsAsync(includeInactive, cancellationToken)).Select(ToDto).ToList();

    public async Task<OrgUnitDto> CreateAsync(CreateOrgUnitRequest request, CancellationToken cancellationToken)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.TypeCode = request.TypeCode?.Trim().ToUpperInvariant() ?? string.Empty;
        Normalize(request);
        OrgUnitRequestValidator.Validate(request);

        var errors = new Dictionary<string, string[]>();
        if (!await orgUnitRepository.IsTypeExistingAsync(request.TypeCode, cancellationToken))
        {
            errors["typeCode"] = [$"Loại đơn vị '{request.TypeCode}' không hợp lệ."];
        }

        if (await orgUnitRepository.IsCodeTakenAsync(request.Code, cancellationToken))
        {
            errors["code"] = [$"Mã đơn vị '{request.Code}' đã tồn tại."];
        }

        await ValidateReferencesAsync(request, errors, cancellationToken);
        errors.ThrowIfInvalid();

        await ValidateParentAsync(request.TypeCode, request.ParentId, null, cancellationToken);

        var now = DateTime.UtcNow;
        var orgUnit = new OrgUnit
        {
            Code = request.Code,
            TypeCode = request.TypeCode,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        Apply(orgUnit, request);

        orgUnitRepository.Add(orgUnit);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(orgUnit);
    }

    public async Task<OrgUnitDto> UpdateAsync(int id, UpdateOrgUnitRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        OrgUnitRequestValidator.Validate(request);

        var orgUnit = await orgUnitRepository.FindByIdAsync(id, cancellationToken);
        if (orgUnit is not { IsActive: true })
        {
            throw new NotFoundException(UnitNotFoundMessage);
        }

        var errors = new Dictionary<string, string[]>();
        await ValidateReferencesAsync(request, errors, cancellationToken);
        errors.ThrowIfInvalid();

        if (orgUnit.ParentId != request.ParentId)
        {
            await ValidateParentAsync(orgUnit.TypeCode, request.ParentId, id, cancellationToken);
        }

        Apply(orgUnit, request);
        orgUnit.UpdatedAt = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(orgUnit);
    }

    /// <summary>OrderedIds phải gồm đủ và đúng các con đang hoạt động (tránh sót / lẫn đơn vị nhánh khác).</summary>
    public async Task ReorderAsync(ReorderOrgUnitsRequest request, CancellationToken cancellationToken)
    {
        OrgUnitRequestValidator.Validate(request);

        var children = await orgUnitRepository.GetActiveChildrenAsync(request.ParentId, cancellationToken);
        if (children.Count == 0)
        {
            throw new BusinessException("Đơn vị này không có đơn vị con để sắp xếp.");
        }

        var childIds = children.Select(x => x.Id).ToHashSet();
        if (request.OrderedIds.Count != childIds.Count || !request.OrderedIds.All(childIds.Contains))
        {
            throw new BusinessException(
                "Danh sách sắp xếp phải gồm đủ các đơn vị con hiện có. Hãy tải lại trang rồi thử lại.");
        }

        var now = DateTime.UtcNow;
        var childrenById = children.ToDictionary(x => x.Id);
        for (var index = 0; index < request.OrderedIds.Count; index++)
        {
            var child = childrenById[request.OrderedIds[index]];
            if (child.SortOrder != index + 1)
            {
                child.SortOrder = index + 1;
                child.UpdatedAt = now;
            }
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var orgUnit = await orgUnitRepository.FindByIdAsync(id, cancellationToken);
        if (orgUnit is not { IsActive: true })
        {
            throw new NotFoundException(UnitNotFoundMessage);
        }

        if (await orgUnitRepository.HasActiveChildrenAsync(id, cancellationToken))
        {
            throw new BusinessException("Đơn vị còn đơn vị con, cần chuyển hoặc xóa đơn vị con trước.");
        }

        if (await orgUnitRepository.HasActiveMembersAsync(id, cancellationToken))
        {
            throw new BusinessException("Đơn vị còn nhân sự đang giữ vị trí, cần điều chuyển trước.");
        }

        orgUnit.IsActive = false;
        orgUnit.UpdatedAt = DateTime.UtcNow;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Cấp trưởng ghi đè và chuyên môn (nếu có) phải tồn tại.</summary>
    private async Task ValidateReferencesAsync(
        OrgUnitRequestBase request, Dictionary<string, string[]> errors, CancellationToken cancellationToken)
    {
        if (request.HeadLevelCode is not null
            && !await orgUnitRepository.IsLevelActiveAsync(request.HeadLevelCode, cancellationToken))
        {
            errors["headLevelCode"] = [$"Cấp bậc '{request.HeadLevelCode}' không hợp lệ."];
        }

        if (request.DisciplineCode is not null
            && !await orgUnitRepository.IsDisciplineActiveAsync(request.DisciplineCode, cancellationToken))
        {
            errors["disciplineCode"] = [$"Chuyên môn '{request.DisciplineCode}' không hợp lệ."];
        }
    }

    /// <summary>Đơn vị cha phải hợp lệ theo bảng OrgUnitTypeParent và không tạo vòng lặp.</summary>
    private async Task ValidateParentAsync(
        string typeCode, int? parentId, int? selfId, CancellationToken cancellationToken)
    {
        var allowedParentTypes = await orgUnitRepository.GetAllowedParentTypesAsync(typeCode, cancellationToken);

        if (allowedParentTypes.Count == 0)
        {
            if (parentId is not null)
            {
                throw FieldError("parentId", "Đơn vị loại này là gốc của cây, không có đơn vị cha.");
            }

            return;
        }

        if (parentId is null)
        {
            throw FieldError("parentId", "Phải chọn đơn vị cha.");
        }

        var parent = await orgUnitRepository.GetByIdAsync(parentId.Value, cancellationToken);
        if (parent is not { IsActive: true })
        {
            throw FieldError("parentId", "Không tìm thấy đơn vị cha.");
        }

        if (!allowedParentTypes.Contains(parent.TypeCode))
        {
            throw FieldError("parentId", $"Đơn vị loại {typeCode} chỉ được nằm dưới: {string.Join(", ", allowedParentTypes)}.");
        }

        // Chống vòng lặp: đi ngược từ đơn vị cha mới lên gốc, không được gặp chính nó
        if (selfId is not null)
        {
            var visited = new HashSet<int>();
            int? cursor = parent.Id;
            while (cursor is { } currentId && visited.Add(currentId))
            {
                if (currentId == selfId)
                {
                    throw FieldError("parentId", "Không thể chuyển đơn vị vào nhánh con của chính nó.");
                }

                cursor = await orgUnitRepository.GetParentIdAsync(currentId, cancellationToken);
            }
        }
    }

    private static void Normalize(OrgUnitRequestBase request)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.ShortName = NullIfEmpty(request.ShortName);
        request.HeadLevelCode = NullIfEmpty(request.HeadLevelCode)?.ToUpperInvariant();
        request.DisciplineCode = NullIfEmpty(request.DisciplineCode)?.ToUpperInvariant();
        request.Area = NullIfEmpty(request.Area);
        request.Shift = NullIfEmpty(request.Shift)?.ToUpperInvariant();
        request.Note = NullIfEmpty(request.Note);
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Apply(OrgUnit orgUnit, OrgUnitRequestBase request)
    {
        orgUnit.Name = request.Name;
        orgUnit.ShortName = request.ShortName;
        orgUnit.ParentId = request.ParentId;
        orgUnit.HeadLevelCode = request.HeadLevelCode;
        orgUnit.DisciplineCode = request.DisciplineCode;
        orgUnit.Area = request.Area;
        orgUnit.Shift = request.Shift;
        orgUnit.SortOrder = request.SortOrder;
        orgUnit.Note = request.Note;
    }

    private static ValidationException FieldError(string field, string message) =>
        new("Dữ liệu không hợp lệ.", new Dictionary<string, string[]> { [field] = [message] });

    private static OrgUnitDto ToDto(OrgUnit orgUnit) => new()
    {
        Id = orgUnit.Id,
        Code = orgUnit.Code,
        Name = orgUnit.Name,
        ShortName = orgUnit.ShortName,
        TypeCode = orgUnit.TypeCode,
        ParentId = orgUnit.ParentId,
        HeadLevelCode = orgUnit.HeadLevelCode,
        DisciplineCode = orgUnit.DisciplineCode,
        Area = orgUnit.Area,
        Shift = orgUnit.Shift,
        SortOrder = orgUnit.SortOrder,
        IsActive = orgUnit.IsActive,
        Note = orgUnit.Note,
    };
}
