using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>
/// Dòng công việc. Kế hoạch (PLAN): thêm/sửa/xóa dòng kế hoạch. Báo cáo (REPORT): sửa phần thực hiện của dòng kế hoạch
/// (không xóa, không sửa giờ công kế hoạch / đầu mục), thêm/sửa/xóa dòng phát sinh.
/// </summary>
public interface IWorkItemService
{
    Task<WorkItemDto> CreateAsync(int formId, string phase, CreateWorkItemRequest request, CancellationToken cancellationToken);

    /// <summary>RowVersion lệch (người khác vừa sửa) → 409 kèm dòng mới nhất.</summary>
    Task<WorkItemDto> UpdateAsync(int id, string phase, UpdateWorkItemRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa mềm dòng và vật tư gắn với dòng.</summary>
    Task DeleteAsync(int id, string phase, CancellationToken cancellationToken);

    /// <summary>Dán từ Excel: lưu các dòng hợp lệ, trả lỗi theo cột cho dòng sai.</summary>
    Task<BatchCreateWorkItemsResultDto> BatchCreateAsync(
        int formId, string phase, BatchCreateWorkItemsRequest request, CancellationToken cancellationToken);

    /// <summary>Gợi ý người thực hiện theo tổ/kíp, đội hoặc cả xưởng.</summary>
    Task<IReadOnlyList<WorkerOptionDto>> GetWorkerOptionsAsync(
        WorkerOptionFilterRequest filter, CancellationToken cancellationToken);
}
