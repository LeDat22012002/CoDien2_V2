using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWorkReportUnitEngineerService
{
    /// <summary>Kỹ sư đang phụ trách đơn vị (người gọi phải xem được đơn vị).</summary>
    Task<IReadOnlyList<WorkReportUnitEngineerDto>> GetEngineersAsync(int unitId, CancellationToken cancellationToken);

    /// <summary>
    /// Lưu cả danh sách kỹ sư phụ trách. Tổ HC: đội trưởng/phó hoặc quản đốc/phó; kíp: chỉ quản đốc/phó (hoặc admin).
    /// Người bỏ ra kết thúc từ hôm nay (bắt đầu hôm nay thì xóa luôn), người thêm vào bắt đầu từ hôm nay.
    /// </summary>
    Task<IReadOnlyList<WorkReportUnitEngineerDto>> SetEngineersAsync(
        int unitId, SetUnitEngineersRequest request, CancellationToken cancellationToken);

    /// <summary>Kỹ sư (cấp KS) trên sơ đồ ở tổ/kíp và đơn vị cha (đội) để gợi ý; cần quyền phân công.</summary>
    Task<IReadOnlyList<EngineerSuggestionDto>> GetSuggestionsAsync(int unitId, CancellationToken cancellationToken);

    /// <summary>Kỹ sư đang phụ trách của nhiều đơn vị (null = mọi đơn vị), nhóm theo Id đơn vị; dùng nội bộ module.</summary>
    Task<IReadOnlyDictionary<int, IReadOnlyList<WorkReportUnitEngineerDto>>> GetActiveByUnitAsync(
        IReadOnlyCollection<int>? unitIds, CancellationToken cancellationToken);
}