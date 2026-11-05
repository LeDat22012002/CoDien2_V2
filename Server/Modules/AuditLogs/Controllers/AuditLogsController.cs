using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.AuditLogs.DTOs;
using Server.Modules.AuditLogs.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.AuditLogs.Controllers;

/// <summary>
/// Nhật ký hệ thống. Xem: audit-logs.view. Ghi lượt mở trang: mọi người đăng nhập (Client tự gọi khi đổi trang).
/// Đăng nhập và thao tác thêm/sửa/xóa do AuditLogMiddleware tự ghi, không qua API.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HasPermission(PermissionCodes.AuditLogs.View)]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<AuditLogDto>>>> GetPaged(
        [FromQuery] AuditLogFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await auditLogService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<AuditLogDto>>.Ok(result));
    }

    [HttpPost("page-views")]
    public ActionResult<ApiResponse<object>> CreatePageView(CreatePageViewRequest request)
    {
        auditLogService.LogPageView(request);
        return Ok(ApiResponse.Ok("Đã ghi nhận."));
    }
}
