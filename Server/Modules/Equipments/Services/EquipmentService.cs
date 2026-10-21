using Server.Data;
using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Entities;
using Server.Modules.Equipments.Repositories.Interfaces;
using Server.Modules.Equipments.Services.Interfaces;
using Server.Modules.Equipments.Validators;
using Server.Modules.Incidents.Services.Interfaces;
using Server.Shared.Exceptions;
using Server.Shared.Helpers;
using Server.Shared.Models;

namespace Server.Modules.Equipments.Services;

public class EquipmentService(
    IEquipmentRepository equipmentRepository,
    IIncidentLookupService incidentLookupService,
    IUnitOfWork unitOfWork) : IEquipmentService
{
    private const string NotFoundMessage = "Không tìm thấy thiết bị.";
    private const int OptionLimit = 50;

    /// <summary>Các sheet tham chiếu của file danh mục gốc (giữ như hệ thống cũ).</summary>
    private static readonly IReadOnlyList<EquipmentImportSheetConfig> DefaultSheetConfigs =
    [
        new() { SheetName = "THAM CHIẾU EQ - XLG1", StartRow = 4, CodeColumn = 1, NameColumn = 2 },
        new() { SheetName = "THAM CHIẾU EQ - XLG2", StartRow = 3, CodeColumn = 1, NameColumn = 2 },
        new() { SheetName = "THAM CHIẾU EQ - XNĐ1", StartRow = 4, CodeColumn = 1, NameColumn = 2 },
        new() { SheetName = "THAM CHIẾU EQ - XNĐ2", StartRow = 4, CodeColumn = 1, NameColumn = 2 },
    ];

    public async Task<PagedResult<EquipmentDto>> GetPagedAsync(
        EquipmentFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await equipmentRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<EquipmentDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public Task<IReadOnlyList<EquipmentDto>> GetOptionsAsync(string? keyword, CancellationToken cancellationToken) =>
        equipmentRepository.GetOptionsAsync(keyword, OptionLimit, cancellationToken);

    public async Task<EquipmentDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        await equipmentRepository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException(NotFoundMessage);

    public Task<EquipmentDto?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        equipmentRepository.GetByCodeAsync(code.Trim(), cancellationToken);

    public async Task<EquipmentDto> CreateAsync(CreateEquipmentRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EquipmentRequestValidator.Validate(request);
        await EnsureCodeAvailableAsync(request.Code, null, cancellationToken);

        var equipment = new Equipment { Code = request.Code, Name = request.Name };
        equipmentRepository.Add(equipment);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(equipment);
    }

    public async Task<EquipmentDto> UpdateAsync(
        int id, UpdateEquipmentRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        EquipmentRequestValidator.Validate(request);

        var equipment = await equipmentRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        await EnsureCodeAvailableAsync(request.Code, id, cancellationToken);

        equipment.Code = request.Code;
        equipment.Name = request.Name;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(equipment);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var equipment = await equipmentRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        if (await incidentLookupService.HasByEquipmentCodeAsync(equipment.Code, cancellationToken))
        {
            throw new BusinessException($"Thiết bị '{equipment.Code}' đã có báo cáo sự cố, không thể xóa!");
        }

        equipmentRepository.Remove(equipment);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public Task<EquipmentImportResultDto> ImportDefaultExcelAsync(IFormFile file, CancellationToken cancellationToken) =>
        ImportExcelAsync(file, DefaultSheetConfigs, cancellationToken);

    public async Task<EquipmentImportResultDto> ImportExcelAsync(
        IFormFile file, IReadOnlyList<EquipmentImportSheetConfig> configs, CancellationToken cancellationToken)
    {
        if (configs.Count == 0)
        {
            throw new BusinessException("Chưa có cấu hình sheet.");
        }

        using var workbook = await ExcelCellReader.OpenWorkbookAsync(file, cancellationToken);

        var result = new EquipmentImportResultDto();
        var rows = new List<(string Code, string? Name)>();

        foreach (var config in configs)
        {
            var sheet = ExcelCellReader.FindSheet(workbook, config.SheetName);
            if (sheet is null)
            {
                result.Errors.Add($"Không tìm thấy sheet '{config.SheetName}'");
                continue;
            }

            if (config.CodeColumn <= 0)
            {
                result.Errors.Add($"[{sheet.Name}] Chưa khai báo cột Mã thiết bị");
                continue;
            }

            var lastRow = ExcelCellReader.GetLastUsedRow(sheet);
            for (var row = Math.Max(config.StartRow, 1); row <= lastRow; row++)
            {
                var code = ExcelCellReader.GetText(sheet, row, config.CodeColumn);
                if (code is null)
                {
                    continue;
                }

                result.TotalRows++;

                if (code.Length > EquipmentRequestValidator.CodeMaxLength)
                {
                    result.Errors.Add(
                        $"[{sheet.Name}] Dòng {row}: mã vượt quá {EquipmentRequestValidator.CodeMaxLength} ký tự");
                    continue;
                }

                var name = ExcelCellReader.Truncate(
                    ExcelCellReader.GetText(sheet, row, config.NameColumn), EquipmentRequestValidator.NameMaxLength);
                rows.Add((code, name));
            }
        }

        // Bỏ qua mã đã có trong danh mục và mã lặp lại trong file (giữ dòng xuất hiện đầu tiên)
        var existingCodes = new HashSet<string>(
            await equipmentRepository.GetExistingCodesAsync(rows.Select(x => x.Code).ToList(), cancellationToken),
            StringComparer.OrdinalIgnoreCase);

        var newEquipments = new List<Equipment>();
        foreach (var (code, name) in rows)
        {
            if (!existingCodes.Add(code))
            {
                result.SkippedCount++;
                continue;
            }

            newEquipments.Add(new Equipment { Code = code, Name = name });
        }

        if (newEquipments.Count > 0)
        {
            equipmentRepository.AddRange(newEquipments);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        result.InsertedCount = newEquipments.Count;
        return result;
    }

    private async Task EnsureCodeAvailableAsync(string code, int? exceptId, CancellationToken cancellationToken)
    {
        if (await equipmentRepository.IsCodeTakenAsync(code, exceptId, cancellationToken))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.",
                new Dictionary<string, string[]> { ["code"] = [$"Mã thiết bị '{code}' đã tồn tại!"] });
        }
    }

    private static void Normalize(EquipmentRequestBase request)
    {
        request.Code = request.Code?.Trim() ?? string.Empty;
        request.Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();
    }

    private static EquipmentDto ToDto(Equipment equipment) =>
        new() { Id = equipment.Id, Code = equipment.Code, Name = equipment.Name };
}
