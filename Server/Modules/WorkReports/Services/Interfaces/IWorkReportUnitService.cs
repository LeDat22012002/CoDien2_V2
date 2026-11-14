using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWorkReportUnitService
{
    /// <summary>Đơn vị báo cáo (lọc theo xưởng nếu có), theo thứ tự trong xưởng, kèm kỹ sư phụ trách và quyền người gọi.</summary>
    Task<IReadOnlyList<WorkReportUnitDto>> GetListAsync(
        WorkReportUnitFilterRequest filter, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Tổ/kíp đang hoạt động của xưởng chưa có đơn vị báo cáo, kèm gợi ý (admin / quản đốc).</summary>
    Task<IReadOnlyList<UnconfiguredOrgUnitDto>> GetUnconfiguredAsync(
        int workshopId, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> CreateAsync(CreateWorkReportUnitRequest request, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> UpdateAsync(
        int id, UpdateWorkReportUnitRequest request, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderWorkReportUnitsRequest request, CancellationToken cancellationToken);
}