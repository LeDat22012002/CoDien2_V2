using Server.Data;
using Server.Modules.Materials.DTOs;
using Server.Modules.Materials.Entities;
using Server.Modules.Materials.Repositories.Interfaces;
using Server.Modules.Materials.Services.Interfaces;
using Server.Modules.Materials.Validators;
using Server.Shared.Exceptions;
using Server.Shared.Models;

namespace Server.Modules.Materials.Services;

public class MaterialService(IMaterialRepository materialRepository, IUnitOfWork unitOfWork) : IMaterialService
{
    private const string NotFoundMessage = "Không tìm thấy vật tư.";
    private const int OptionLimit = 20;
    private const int OptionMinKeywordLength = 2;

    public async Task<PagedResult<MaterialDto>> GetPagedAsync(
        MaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await materialRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<MaterialDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<IReadOnlyList<MaterialOptionDto>> GetOptionsAsync(
        string? keyword, CancellationToken cancellationToken)
    {
        var value = keyword?.Trim();
        if (string.IsNullOrEmpty(value) || value.Length < OptionMinKeywordLength)
        {
            return [];
        }

        return await materialRepository.GetOptionsAsync(value, OptionLimit, cancellationToken);
    }

    public async Task<MaterialOptionDto?> GetByCodeAsync(string? code, CancellationToken cancellationToken)
    {
        var value = code?.Trim();
        return string.IsNullOrEmpty(value)
            ? null
            : await materialRepository.GetByCodeAsync(value, cancellationToken);
    }

    public async Task<MaterialDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        await materialRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException(NotFoundMessage);

    public Task<MaterialLookupsDto> GetLookupsAsync(CancellationToken cancellationToken) =>
        materialRepository.GetLookupsAsync(cancellationToken);

    public async Task<MaterialDto> CreateAsync(CreateMaterialRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        MaterialRequestValidator.Validate(request);
        await EnsureCodeAvailableAsync(request, null, cancellationToken);

        var material = new Material();
        ApplyRequest(material, request);
        materialRepository.Add(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(material);
    }

    public async Task<MaterialDto> UpdateAsync(int id, UpdateMaterialRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        MaterialRequestValidator.Validate(request);

        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        await EnsureCodeAvailableAsync(request, id, cancellationToken);

        ApplyRequest(material, request);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(material);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var material = await materialRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        materialRepository.Remove(material);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Cùng mã được phép ở Plant khác nhau; trùng cả mã lẫn Plant thì báo lỗi ở ô mã.</summary>
    private async Task EnsureCodeAvailableAsync(
        MaterialRequestBase request, int? exceptId, CancellationToken cancellationToken)
    {
        if (await materialRepository.IsCodeTakenAsync(request.Code, request.Plant, exceptId, cancellationToken))
        {
            var plantText = request.Plant is null ? "chưa có Plant" : $"Plant '{request.Plant}'";
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["code"] = [$"Mã vật tư '{request.Code}' ({plantText}) đã tồn tại."],
            });
        }
    }

    /// <summary>Cắt khoảng trắng; chuỗi rỗng ở trường không bắt buộc coi như null.</summary>
    private static void Normalize(MaterialRequestBase request)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.Description = NullIfEmpty(request.Description);
        request.BasicDataText = NullIfEmpty(request.BasicDataText);
        request.Plant = NullIfEmpty(request.Plant);
        request.MaterialGroup = NullIfEmpty(request.MaterialGroup);
        request.Class = NullIfEmpty(request.Class);
        request.Level = NullIfEmpty(request.Level);
        request.MaterialLevel = NullIfEmpty(request.MaterialLevel);
        request.DocumentNo = NullIfEmpty(request.DocumentNo);
        request.TypeOfSupplies = NullIfEmpty(request.TypeOfSupplies);
        request.Uom = NullIfEmpty(request.Uom);
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void ApplyRequest(Material material, MaterialRequestBase request)
    {
        material.Code = request.Code;
        material.Description = request.Description;
        material.BasicDataText = request.BasicDataText;
        material.Plant = request.Plant;
        material.MaterialGroup = request.MaterialGroup;
        material.Class = request.Class;
        material.Level = request.Level;
        material.MaterialLevel = request.MaterialLevel;
        material.DocumentNo = request.DocumentNo;
        material.TypeOfSupplies = request.TypeOfSupplies;
        material.Uom = request.Uom;
    }

    private static MaterialDto ToDto(Material material) => new()
    {
        Id = material.Id,
        Code = material.Code,
        Description = material.Description,
        BasicDataText = material.BasicDataText,
        Plant = material.Plant,
        MaterialGroup = material.MaterialGroup,
        Class = material.Class,
        Level = material.Level,
        MaterialLevel = material.MaterialLevel,
        DocumentNo = material.DocumentNo,
        TypeOfSupplies = material.TypeOfSupplies,
        Uom = material.Uom,
    };
}