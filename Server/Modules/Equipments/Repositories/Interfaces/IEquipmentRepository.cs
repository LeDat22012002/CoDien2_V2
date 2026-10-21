using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Entities;

namespace Server.Modules.Equipments.Repositories.Interfaces;

public interface IEquipmentRepository
{
    Task<(IReadOnlyList<EquipmentDto> Items, int TotalCount)> GetPagedAsync(
        EquipmentFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Danh sách chọn: tìm theo mã/tên, tối đa take dòng.</summary>
    Task<IReadOnlyList<EquipmentDto>> GetOptionsAsync(string? keyword, int take, CancellationToken cancellationToken);

    Task<EquipmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<EquipmentDto?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / xóa.</summary>
    Task<Equipment?> FindByIdAsync(int id, CancellationToken cancellationToken);

    Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken);

    /// <summary>Các mã trong danh sách đã có trong danh mục.</summary>
    Task<IReadOnlyList<string>> GetExistingCodesAsync(IReadOnlyCollection<string> codes, CancellationToken cancellationToken);

    void Add(Equipment equipment);

    void AddRange(IEnumerable<Equipment> equipments);

    void Remove(Equipment equipment);
}
