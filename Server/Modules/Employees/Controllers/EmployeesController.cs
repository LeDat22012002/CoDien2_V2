using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Services.Interfaces;
using Server.Shared.Models;

namespace Server.Modules.Employees.Controllers;

[ApiController]
[Route("api/employees")]
public class EmployeesController(IEmployeeService employeeService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<EmployeeDto>>>> GetPaged(
        [FromQuery] EmployeeFilterRequest filter, CancellationToken cancellationToken)
    {
        var result = await employeeService.GetPagedAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResult<EmployeeDto>>.Ok(result));
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await employeeService.GetByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Create(
        CreateEmployeeRequest request, CancellationToken cancellationToken)
    {
        var result = await employeeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<EmployeeDto>.Ok(result, "Thêm nhân viên thành công."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<EmployeeDto>>> Update(
        int id, UpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        var result = await employeeService.UpdateAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmployeeDto>.Ok(result, "Cập nhật nhân viên thành công."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id, CancellationToken cancellationToken)
    {
        await employeeService.DeleteAsync(id, cancellationToken);
        return Ok(ApiResponse.Ok("Xóa nhân viên thành công."));
    }
}
