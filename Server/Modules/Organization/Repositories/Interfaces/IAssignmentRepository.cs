using Server.Modules.Employees.Entities;
using Server.Modules.Organization.Entities;

namespace Server.Modules.Organization.Repositories.Interfaces;

public interface IAssignmentRepository
{
    /// <summary>Có tracking; dùng khi kết thúc vị trí.</summary>
    Task<EmployeeAssignment?> FindByIdAsync(int id, CancellationToken cancellationToken);

    /// <summary>Đọc bảng Employee (chỉ đọc) để kiểm tra khi đổi chức vụ.</summary>
    Task<Employee?> GetEmployeeByCodeAsync(string empCode, CancellationToken cancellationToken);

    /// <summary>Đơn vị đang hoạt động theo mã, kèm loại đơn vị.</summary>
    Task<OrgUnit?> GetActiveUnitByCodeAsync(string code, CancellationToken cancellationToken);

    Task<bool> IsLevelActiveAsync(string levelCode, CancellationToken cancellationToken);

    /// <summary>Đơn vị có người khác đang giữ cấp này (officialOnly = bỏ qua người giữ "Quyền").</summary>
    Task<bool> HasOtherHolderAsync(
        int orgUnitId, string levelCode, int employeeId, bool officialOnly, CancellationToken cancellationToken);

    /// <summary>Có tracking: các vị trí đang hiệu lực của nhân viên (primaryOnly = chỉ vị trí chính).</summary>
    Task<IReadOnlyList<EmployeeAssignment>> GetOpenAssignmentsAsync(
        int employeeId, bool primaryOnly, CancellationToken cancellationToken);

    Task<IReadOnlyList<VAssignmentHistory>> GetHistoryAsync(string empCode, CancellationToken cancellationToken);

    void Add(EmployeeAssignment assignment);
}
