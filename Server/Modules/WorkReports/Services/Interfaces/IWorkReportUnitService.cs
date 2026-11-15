using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Đơn vị báo cáo của xưởng. Mặc định = tổ/kíp trên sơ đồ (tự tạo); quản đốc/phó của xưởng hoặc admin
/// sửa, xóa (chưa có dữ liệu), khôi phục, thêm đơn vị tự đặt, sắp thứ tự.
/// </summary>
public interface IWorkReportUnitService
{
    /// <summary>
    /// Đơn vị báo cáo (lọc theo xưởng nếu có), theo thứ tự trong xưởng, kèm kỹ sư phụ trách và quyền người gọi.
    /// Tự tạo trước đơn vị cho tổ/kíp mới trên sơ đồ.
    /// </summary>
    Task<IReadOnlyList<WorkReportUnitDto>> GetListAsync(
        WorkReportUnitFilterRequest filter, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Đơn vị đã xóa của xưởng (để khôi phục).</summary>
    Task<IReadOnlyList<WorkReportUnitDto>> GetDeletedAsync(int workshopId, CancellationToken cancellationToken);

    /// <summary>Xưởng và các đội trong xưởng: chỗ gắn đơn vị tự đặt.</summary>
    Task<IReadOnlyList<WorkReportUnitParentOptionDto>> GetParentOptionsAsync(
        int workshopId, CancellationToken cancellationToken);

    /// <summary>Thêm đơn vị tự đặt (không phải tổ/kíp trên sơ đồ).</summary>
    Task<WorkReportUnitDto> CreateAsync(CreateWorkReportUnitRequest request, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> UpdateAsync(
        int id, UpdateWorkReportUnitRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa đơn vị chưa có dữ liệu (đã có thì chỉ ngừng dùng được); tổ/kíp theo sơ đồ không tự tạo lại.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);

    Task<WorkReportUnitDto> RestoreAsync(int id, CancellationToken cancellationToken);

    Task ReorderAsync(ReorderWorkReportUnitsRequest request, CancellationToken cancellationToken);
}
