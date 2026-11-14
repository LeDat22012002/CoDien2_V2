using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

public class MaterialPurposeService(
    IMaterialPurposeRepository purposeRepository,
    IUnitOfWork unitOfWork) : IMaterialPurposeService
{
    private const string NotFoundMessage = "Không tìm thấy mục đích sử dụng vật tư.";
    private const int SortOrderStep = 10;

    public async Task<IReadOnlyList<MaterialPurposeDto>> GetListAsync(
        bool includeInactive, CancellationToken cancellationToken) =>
        (await purposeRepository.GetListAsync(includeInactive, cancellationToken)).Select(ToDto).ToList();

    public async Task<MaterialPurposeDto> CreateAsync(
        CreateMaterialPurposeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        MaterialPurposeRequestValidator.Validate(request);
        await EnsureCodeAvailableAsync(request.Code, null, cancellationToken);

        var purpose = new MaterialPurpose
        {
            Code = request.Code,
            Name = request.Name,
            SortOrder = request.SortOrder
                        ?? await purposeRepository.GetMaxSortOrderAsync(cancellationToken) + SortOrderStep,
            IsActive = true,
        };

        purposeRepository.Add(purpose);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(purpose);
    }

    public async Task<MaterialPurposeDto> UpdateAsync(
        int id, UpdateMaterialPurposeRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        MaterialPurposeRequestValidator.Validate(request);

        var purpose = await purposeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        await EnsureCodeAvailableAsync(request.Code, id, cancellationToken);

        purpose.Code = request.Code;
        purpose.Name = request.Name;
        purpose.SortOrder = request.SortOrder ?? purpose.SortOrder;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(purpose);
    }

    public async Task<MaterialPurposeDto> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        var purpose = await purposeRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        purpose.IsActive = isActive;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(purpose);
    }

    private async Task EnsureCodeAvailableAsync(string code, int? exceptId, CancellationToken cancellationToken)
    {
        if (await purposeRepository.IsCodeTakenAsync(code, exceptId, cancellationToken))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["code"] = [$"Mục đích '{code}' đã có."],
            });
        }
    }

    private static void Normalize(MaterialPurposeRequestBase request)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();
    }

    private static MaterialPurposeDto ToDto(MaterialPurpose purpose) => new()
    {
        Id = purpose.Id,
        Code = purpose.Code,
        Name = purpose.Name,
        SortOrder = purpose.SortOrder,
        IsActive = purpose.IsActive,
    };
}