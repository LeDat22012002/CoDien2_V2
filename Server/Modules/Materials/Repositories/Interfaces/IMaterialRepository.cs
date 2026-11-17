using Server.Modules.Materials.DTOs;
using Server.Modules.Materials.Entities;

namespace Server.Modules.Materials.Repositories.Interfaces;

public interface IMaterialRepository
{
    Task<(IReadOnlyList<MaterialDto> Items, int TotalCount)> GetPagedAsync(
        MaterialFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Gợi ý theo mã hoặc tên: khớp đúng mã trước, rồi mã bắt đầu bằng keyword, rồi còn lại; tối đa take dòng.</summary>
    Task<IReadOnlyList<MaterialOptionDto>> GetOptionsAsync(string keyword, int take, CancellationToken cancellationToken);

    /// <summary>Khớp đúng mã (không phân biệt hoa thường theo collation DB). Nhiều Plant: ưu tiên dòng có đơn vị tính, rồi Id nhỏ.</summary>
    Task<MaterialOptionDto?> GetByCodeAsync(string code, CancellationToken cancellationToken);

    Task<MaterialDto?> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Có tracking; dùng khi cập nhật / xóa.</summary>
    Task<Material?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Cặp (mã, Plant) đã có ở dòng khác. Plant null chỉ trùng với Plant null.</summary>
    Task<bool> IsCodeTakenAsync(string code, string? plant, int? exceptId, CancellationToken cancellationToken);

    Task<MaterialLookupsDto> GetLookupsAsync(CancellationToken cancellationToken);

    void Add(Material material);

    void Remove(Material material);
}