using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>
/// Xuất Excel kế hoạch / báo cáo tuần theo xưởng (quyền work-reports.export). File chỉ gồm các tổ/kíp người gọi
/// xem được, giống màn hình.
/// </summary>
[ApiController]
[Route("api/work-reports/export")]
[HasPermission(PermissionCodes.WorkReports.Export)]
public class WorkReportExportController(IWorkReportExportService exportService) : ControllerBase
{
    /// <summary>GET /api/work-reports/export?workshopId=&amp;weekId=&amp;phase=PLAN|REPORT → file .xlsx.</summary>
    [HttpGet]
    public async Task<IActionResult> Export([FromQuery] WorkReportExportRequest request, CancellationToken cancellationToken)
    {
        var file = await exportService.ExportAsync(request, cancellationToken);
        return File(file.Content, WorkReportExportFile.ContentType, file.FileName);
    }
}