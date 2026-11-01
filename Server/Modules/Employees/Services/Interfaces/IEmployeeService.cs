using Server.Modules.Employees.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Employees.Services.Interfaces;

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeFilterRequest filter, CancellationToken cancellationToken);

    Task<EmployeeDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken);

    Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);

    /// <summary>Lưu ảnh vào thư mục upload, cập nhật AvatarUrl và xóa ảnh cũ.</summary>
    Task<EmployeeDto> UpdateAvatarAsync(int id, IFormFile? file, CancellationToken cancellationToken);

    /// <summary>Đổi ảnh của nhân viên gắn với tài khoản đang đăng nhập (không cần quyền sửa nhân viên).</summary>
    Task<EmployeeDto> UpdateMyAvatarAsync(IFormFile? file, CancellationToken cancellationToken);
}
