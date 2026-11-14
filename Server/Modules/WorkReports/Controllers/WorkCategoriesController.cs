using Microsoft.AspNetCore.Mvc;
using Server.Gateway.Authorization;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Models;

namespace Server.Modules.WorkReports.Controllers;

/// <summary>Đầu mục công việc (nhóm A–I). Xem: chỉ cần đăng nhập; thêm/sửa/ngừng dùng: work-reports.configure.</summary>
[ApiController]
[Route("api/work-categories")]
public class WorkCategoriesController(IWorkCategoryService categoryService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<WorkCategoryDto>>>> GetList(
        [FromQuery] WorkCategoryFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await categoryService.GetListAsync(filter, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<WorkCategoryDto>>.Ok(result));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkCategoryDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await categoryService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<WorkCategoryDto>.Ok(result));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<WorkCategoryDto>>> Create(
        CreateWorkCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<WorkCategoryDto>.Ok(result, "Thêm đầu mục công việc thành công."));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<WorkCategoryDto>>> Update(
        int id, UpdateWorkCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkCategoryDto>.Ok(result, "Cập nhật đầu mục công việc thành công."));
    }

    [HasPermission(PermissionCodes.WorkReports.Configure)]
    [HttpPatch("{id:int}/active")]
    public async Task<ActionResult<ApiResponse<WorkCategoryDto>>> SetActive(
        int id, SetWorkCategoryActiveRequest request, CancellationToken cancellationToken)
    {
        var result = await categoryService.SetActiveAsync(id, request.IsActive, cancellationToken);
        return Ok(ApiResponse<WorkCategoryDto>.Ok(result,
            request.IsActive ? "Đã dùng lại đầu mục công việc." : "Đã ngừng dùng đầu mục công việc."));
    }
}