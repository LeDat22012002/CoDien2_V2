using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

/// <summary>Gợi ý người thực hiện (dùng chung kế hoạch / báo cáo).</summary>
public interface IWorkerOptionService
{
    /// <summary>Scope UNIT (tổ/kíp) | TEAM (đội) | WORKSHOP (xưởng).</summary>
    Task<IReadOnlyList<WorkerOptionDto>> GetWorkerOptionsAsync(
        WorkerOptionFilterRequest filter, CancellationToken cancellationToken);
}

/// <summary>Kế hoạch tuần: lưới, tổng hợp, thêm/sửa/xóa dòng (trong hạn kế hoạch hoặc khi admin mở khóa).</summary>
public interface IWorkPlanService
{
    Task<WorkGridDto<WeeklyPlanFormDto>> GetGridAsync(WorkReportGridRequest request, CancellationToken cancellationToken);

    Task<WorkReportSummaryDto> GetSummaryAsync(WorkReportGridRequest request, CancellationToken cancellationToken);

    Task<WorkPlanItemDto> CreateAsync(int formId, PlanItemRequest request, CancellationToken cancellationToken);

    /// <summary>Body có rowVersion; người khác vừa sửa → 409 kèm dòng mới nhất.</summary>
    Task<WorkPlanItemDto> UpdateAsync(int id, UpdatePlanItemRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa cả vật tư kế hoạch của dòng. Mã đã cấp không dùng lại.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

/// <summary>
/// Báo cáo tuần: lưới (kèm gợi ý từ kế hoạch cho người nhập), tổng hợp, thêm/sửa/xóa dòng trong từng đầu mục,
/// đưa dòng kế hoạch vào báo cáo.
/// </summary>
public interface IWorkReportService
{
    Task<WorkGridDto<WeeklyReportFormDto>> GetGridAsync(WorkReportGridRequest request, CancellationToken cancellationToken);

    Task<WorkReportSummaryDto> GetSummaryAsync(WorkReportGridRequest request, CancellationToken cancellationToken);

    /// <summary>Thêm việc phát sinh (không có trong kế hoạch).</summary>
    Task<WorkReportItemDto> CreateAsync(int formId, ReportItemRequest request, CancellationToken cancellationToken);

    /// <summary>Chép các dòng kế hoạch (gợi ý) của form vào báo cáo, giữ mã công việc; chép cả vật tư kế hoạch.</summary>
    Task<IReadOnlyList<WorkReportItemDto>> AcceptPlanItemsAsync(
        int formId, AcceptPlanItemsRequest request, CancellationToken cancellationToken);

    Task<WorkReportItemDto> UpdateAsync(int id, UpdateReportItemRequest request, CancellationToken cancellationToken);

    /// <summary>Xóa cả vật tư báo cáo của dòng; dòng lấy từ kế hoạch thì kế hoạch đó lại thành gợi ý.</summary>
    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

/// <summary>Vật tư của 1 giai đoạn (kế hoạch hoặc báo cáo; 2 bản đăng ký riêng).</summary>
public interface IWorkMaterialService
{
    Task<IReadOnlyList<WorkMaterialDto>> GetByFormAsync(int formId, CancellationToken cancellationToken);

    Task<IReadOnlyList<WorkMaterialDto>> GetWorkshopMaterialsAsync(
        WorkshopMaterialFilterRequest filter, CancellationToken cancellationToken);

    Task<WorkMaterialDto> CreateAsync(int formId, CreateWorkMaterialRequest request, CancellationToken cancellationToken);

    Task<WorkMaterialDto> UpdateAsync(int id, UpdateWorkMaterialRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);
}

public interface IWorkPlanMaterialService : IWorkMaterialService;

public interface IWorkReportMaterialService : IWorkMaterialService;
