using Server.Modules.Equipments.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Equipments.Services.Interfaces;

public interface IEquipmentService
{
    Task<PagedResult<EquipmentDto>> GetPagedAsync(EquipmentFilterRequest filter, CancellationToken cancellationToken);

    Task<IReadOnlyList<EquipmentDto>> GetOptionsAsync(string? keyword, CancellationToken cancellationToken);

    Task<EquipmentDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Null nếu mã không có trong danh mục (module Incidents dùng để kiểm tra thiết bị).</summary>
    Task<EquipmentDto?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    Task<EquipmentDto> CreateAsync(CreateEquipmentRequest request, CancellationToken cancellationToken);

    Task<EquipmentDto> UpdateAsync(int id, UpdateEquipmentRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa mềm; chặn khi thiết bị đã có báo cáo sự cố.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);

    Task<EquipmentImportResultDto> ImportExcelAsync(
        IFormFile file, IReadOnlyList<EquipmentImportSheetConfig> configs, CancellationToken cancellationToken);

    /// <summary>Import theo 4 sheet "THAM CHIẾU EQ" cố định của file danh mục gốc.</summary>
    Task<EquipmentImportResultDto> ImportDefaultExcelAsync(IFormFile file, CancellationToken cancellationToken);
}
