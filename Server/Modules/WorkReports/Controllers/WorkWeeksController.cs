using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>Kỳ tuần và hạn nộp. Xem: đăng nhập; chỉnh hạn (chung / riêng xưởng): work-reports.configure.</summary>
[ApiController]
[Route("api/work-weeks")]
public class WorkWeeksController(IWorkWeekService weekService) : ControllerBase
{
    /// <summary>Các tuần của 1 năm ISO; truyền workshopId để có hạn áp dụng cho xưởng đó.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkWeekDto>>>> GetList(
        [FromQuery] WorkWeekFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await weekService.GetListAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkWeekDto>>.Ok(result));
    }

    /// <summary>Tuần đang nhập báo cáo + tuần đang lập kế hoạch tại thời điểm hiện tại.</summary>
    [HttpGet("current")]
    public async Task<ActionResult<ApiResponse<WorkingWeeksDto>>> GetCurrent(
        [FromQuery] int? workshopId, CancellationToken cancellationToken)
    {
        var result = await weekService.GetWorkingWeeksAsync(workshopId, cancellationToken);
        return Ok(ApiResponse<WorkingWeeksDto>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkWeekDto>>> GetById(
        int id, [FromQuery] int? workshopId, CancellationToken cancellationToken)
    {
        var result = await weekService.GetByIdAsync(id, workshopId, cancellationToken);
        return Ok(ApiResponse<WorkWeekDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPut("{id:int}/deadline")]
    public async Task<ActionResult<ApiResponse<WorkWeekDto>>> UpdateDeadline(
        int id, UpdateWorkWeekDeadlineRequest request, CancellationToken cancellationToken)
    {
        var result = await weekService.UpdateDeadlineAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkWeekDto>.Ok(result, "Đã cập nhật hạn nộp."));
    }
}