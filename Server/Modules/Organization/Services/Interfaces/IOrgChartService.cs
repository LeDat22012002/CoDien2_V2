using Server.Modules.Organization.DTOs;

namespace Server.Modules.Organization.Services.Interfaces;

public interface IOrgChartService
{
    Task<OrgChartTreeDto> GetTreeAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<UnitMemberDto>> GetMembersAsync(int orgUnitId, CancellationToken cancellationToken);

    Task<LookupsDto> GetLookupsAsync(CancellationToken cancellationToken);

    /// <summary>Trong danh sách nhân viên truyền vào, những ai đang bị ẩn khỏi sơ đồ.</summary>
    Task<IReadOnlyList<int>> GetHiddenEmployeeIdsAsync(
        IReadOnlyCollection<int> employeeIds, CancellationToken cancellationToken);

    /// <summary>
    /// Ẩn / hiện nhân viên trên sơ đồ (vẫn giữ vị trí và đơn vị). Chỉ đánh dấu thay đổi,
    /// không SaveChanges: người gọi lưu trong cùng transaction với thay đổi của mình.
    /// </summary>
    Task SetHiddenAsync(int employeeId, bool isHidden, CancellationToken cancellationToken);
}
