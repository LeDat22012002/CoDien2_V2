using Server.Modules.Employees.Entities;
using Server.Shared.Entities;

namespace Server.Modules.Organization.Entities;

/// <summary>
/// Nhân viên không hiện trên sơ đồ tổ chức (vẫn giữ vị trí, vẫn thuộc đơn vị/xưởng như bình thường).
/// Có dòng (chưa xóa mềm) = ẩn; hiện lại = xóa mềm dòng đó.
/// </summary>
public class OrgChartHiddenEmployee : BaseEntity
{
    public int EmployeeId { get; set; }

    public Employee Employee { get; set; } = null!;
}
