using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Vật tư sử dụng, gắn dòng công việc. Kế hoạch: vật tư dự kiến (số lượng kế hoạch).
/// Báo cáo: nhập số lượng thực tế, thêm/xóa vật tư phát sinh; vật tư kế hoạch không xóa ở báo cáo.
/// </summary>
public interface IWorkMaterialService
{
    Task<IReadOnlyList<WorkMaterialDto>> GetByFormAsync(int formId, string phase, CancellationToken cancellationToken);

    Task<WorkMaterialDto> CreateAsync(
        int formId, string phase, CreateWorkMaterialRequest request, CancellationToken cancellationToken);

    Task<WorkMaterialDto> UpdateAsync(
        int id, string phase, UpdateWorkMaterialRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, string phase, CancellationToken cancellationToken);

    /// <summary>Vật tư cả xưởng trong tuần (các tổ/kíp người gọi xem được).</summary>
    Task<IReadOnlyList<WorkMaterialDto>> GetWorkshopMaterialsAsync(
        WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken);
}
