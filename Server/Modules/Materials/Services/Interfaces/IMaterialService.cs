using Server.Modules.Materials.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Materials.Services.Interfaces;

public interface IMaterialService
{
    Task<PagedResult<MaterialDto>> GetPagedAsync(MaterialFilterRequest filter, CancellationToken cancellationToken);

    /// <summary>Gợi ý mã vật tư (tối đa 20 dòng); keyword dưới 2 ký tự trả rỗng.</summary>
    Task<IReadOnlyList<MaterialOptionDto>> GetOptionsAsync(string? keyword, CancellationToken cancellationToken);

    /// <summary>Null nếu mã không có trong danh mục (nhập tự do vẫn được). Module khác cũng dùng hàm này.</summary>
    Task<MaterialOptionDto?> GetByCodeAsync(string? code, CancellationToken cancellationToken);

    Task<MaterialDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<MaterialLookupsDto> GetLookupsAsync(CancellationToken cancellationToken);

    Task<MaterialDto> CreateAsync(CreateMaterialRequest request, CancellationToken cancellationToken);

    Task<MaterialDto> UpdateAsync(int id, UpdateMaterialRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa cứng. Vật tư đã nhập ở báo cáo tuần lưu bản chụp mã/tên nên không bị ảnh hưởng.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}