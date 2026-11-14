using Server.Modules.WorkReports.DTOs;

namespace Server.Modules.WorkReports.Services.Interfaces;

public interface IWorkCategoryService
{
    Task<IReadOnlyList<WorkCategoryDto>> GetListAsync(
        WorkCategoryFilterRequest filter, CancellationToken cancellationToken);

    Task<WorkCategoryDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<WorkCategoryDto> CreateAsync(CreateWorkCategoryRequest request, CancellationToken cancellationToken);

    Task<WorkCategoryDto> UpdateAsync(int id, UpdateWorkCategoryRequest request, CancellationToken cancellationToken);

    /// <summary>Ngừng dùng / dùng lại (đầu mục không xóa vì có thể đã có dữ liệu).</summary>
    Task<WorkCategoryDto> SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken);
}