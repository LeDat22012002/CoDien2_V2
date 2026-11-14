using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>Cấu hình chung báo cáo tuần (giờ công hiệu dụng HC/KIP, hạn nộp, cảnh báo). Xem: đăng nhập; sửa: configure.</summary>
[ApiController]
[Route("api/work-report-settings")]
public class WorkReportSettingsController(IWorkReportSettingService settingService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<WorkReportSettingDto>>> Get(CancellationToken cancellationToken)
    {
        var result = await settingService.GetAsync(cancellationToken);
        return Ok(ApiResponse<WorkReportSettingDto>.Ok(result));
    }

    /// <summary>deadlineTime gửi dạng "HH:mm:ss", vd "11:00:00".</summary>
    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPut]
    public async Task<ActionResult<ApiResponse<WorkReportSettingDto>>> Update(
        UpdateWorkReportSettingRequest request, CancellationToken cancellationToken)
    {
        var result = await settingService.UpdateAsync(request, cancellationToken);
        return Ok(ApiResponse<WorkReportSettingDto>.Ok(result, "Cập nhật cấu hình thành công."));
    }
}