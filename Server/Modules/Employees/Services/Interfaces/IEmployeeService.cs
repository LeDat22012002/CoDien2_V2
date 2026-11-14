using Server.Modules.Employees.DTOs;
using Server.Shared.Models;

namespace Server.Modules.Employees.Services.Interfaces;

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeFilterRequest filter, CancellationToken cancellationToken);

    Task<EmployeeDto> GetByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Thông tin rút gọn của danh sách nhân viên (bỏ qua Id không tồn tại); dùng cho module khác.</summary>
    Task<IReadOnlyList<EmployeeBriefDto>> GetBriefsAsync(
        IReadOnlyCollection<int> ids, CancellationToken cancellationToken);

    /// <summary>Id nhân viên đang làm việc gắn với tài khoản đăng nhập (EmpCode); null nếu không có / đã nghỉ.</summary>
    Task<int?> GetCurrentEmployeeIdAsync(CancellationToken cancellationToken);

    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken);

    Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(int id, CancellationToken cancellationToken);

    /// <summary>Lưu ảnh vào thư mục upload, cập nhật AvatarUrl và xóa ảnh cũ.</summary>
    Task<EmployeeDto> UpdateAvatarAsync(int id, IFormFile? file, CancellationToken cancellationToken);

    /// <summary>Đổi ảnh của nhân viên gắn với tài khoản đang đăng nhập (không cần quyền sửa nhân viên).</summary>
    Task<EmployeeDto> UpdateMyAvatarAsync(IFormFile? file, CancellationToken cancellationToken);
}
