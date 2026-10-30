using Server.Modules.Incidents.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Incidents.Services.Interfaces;

public interface IIncidentService
{
    Task<PagedResult<IncidentDto>> GetPagedAsync(IncidentFilterRequest filter, CancellationToken cancellationToken);

    Task<IncidentDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Xưởng đang hoạt động (đơn vị cấp 1) cho bộ lọc và form báo cáo.</summary>
    Task<IReadOnlyList<IncidentWorkshopDto>> GetWorkshopsAsync(CancellationToken cancellationToken);

    /// <summary>Người nhập và thời điểm nhập lấy theo tài khoản đăng nhập và giờ server.</summary>
    Task<IncidentDto> CreateAsync(CreateIncidentRequest request, CancellationToken cancellationToken);

    /// <summary>Sửa đầy đủ (quyền quản lý).</summary>
    Task<IncidentDto> UpdateAsync(int id, UpdateIncidentRequest request, CancellationToken cancellationToken);

    /// <summary>Mốc thời gian, mô tả, phương án: người nhập hoặc quản lý.</summary>
    Task<IncidentDto> UpdateProgressAsync(
        int id, UpdateIncidentProgressRequest request, CancellationToken cancellationToken);

    /// <summary>Nguyên nhân, nguyên nhân gốc, hành động: phân tích xưởng mình hoặc quản lý.</summary>
    Task<IncidentDto> UpdateAnalysisAsync(
        int id, UpdateIncidentAnalysisRequest request, CancellationToken cancellationToken);

    /// <summary>Số order, link biên bản: người nhập, phân tích xưởng mình hoặc quản lý.</summary>
    Task<IncidentDto> UpdateSupplementAsync(
        int id, UpdateIncidentSupplementRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);

    Task<IncidentImportResultDto> ImportExcelAsync(
        IFormFile file, IReadOnlyList<IncidentImportSheetConfig> configs, CancellationToken cancellationToken);
}
