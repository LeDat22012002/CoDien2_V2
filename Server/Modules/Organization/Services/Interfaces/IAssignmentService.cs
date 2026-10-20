using Server.Modules.Organization.DTOs;

namespace Server.Modules.Organization.Services.Interfaces;

public interface IAssignmentService
{
    /// <summary>Đổi chức vụ / điều chuyển / bổ nhiệm / giao quyền (thay cho usp_ChangeAssignment).</summary>
    Task ChangeAsync(ChangeAssignmentRequest request, CancellationToken cancellationToken);

    Task EndAsync(int assignmentId, EndAssignmentRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<AssignmentHistoryDto>> GetHistoryAsync(string empCode, CancellationToken cancellationToken);

    /// <summary>
    /// Kết thúc mọi vị trí đang giữ của nhân viên (khi nghỉ việc). Chỉ đánh dấu thay đổi,
    /// không SaveChanges: người gọi lưu trong cùng transaction với thay đổi của mình.
    /// </summary>
    Task EndAllActiveAsync(int employeeId, DateOnly endDate, CancellationToken cancellationToken);
}
