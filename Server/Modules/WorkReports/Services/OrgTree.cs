using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Ảnh chụp cây đơn vị (đọc qua IOrgUnitService, gồm cả đơn vị đã ngừng) để tìm xưởng, đội, tổ tiên, con cháu.
/// Xưởng = đơn vị cấp 1 (cha là gốc Nhà máy), giống cách module Incidents/Documents xác định.
/// </summary>
public sealed class OrgTree
{
    private readonly Dictionary<int, OrgUnitDto> _units;
    private readonly ILookup<int?, OrgUnitDto> _childrenByParent;

    public OrgTree(IEnumerable<OrgUnitDto> units)
    {
        _units = units.ToDictionary(x => x.Id);
        _childrenByParent = _units.Values.ToLookup(x => x.ParentId);
    }

    public OrgUnitDto? Get(int id) => _units.GetValueOrDefault(id);

    /// <summary>Các xưởng (đơn vị cấp 1) đang hoạt động, theo thứ tự sơ đồ.</summary>
    public IReadOnlyList<OrgUnitDto> GetWorkshops() =>
        _units.Values
            .Where(x => x.IsActive && x.ParentId is { } parentId && _units.TryGetValue(parentId, out var parent)
                        && parent.ParentId is null)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .ToList();

    /// <summary>Tổ tiên từ cha trở lên tới gốc (không gồm chính đơn vị).</summary>
    public IEnumerable<OrgUnitDto> GetAncestors(int id)
    {
        var visited = new HashSet<int> { id };
        var current = Get(id);
        while (current?.ParentId is { } parentId && visited.Add(parentId) && _units.TryGetValue(parentId, out var parent))
        {
            yield return parent;
            current = parent;
        }
    }

    /// <summary>Xưởng chứa đơn vị (chính nó nếu là đơn vị cấp 1); null nếu là gốc hoặc không tìm thấy.</summary>
    public OrgUnitDto? GetWorkshop(int id)
    {
        var unit = Get(id);
        if (unit?.ParentId is null)
        {
            return null;
        }

        var chain = new List<OrgUnitDto> { unit };
        chain.AddRange(GetAncestors(id));

        // Phần tử cuối là gốc (Nhà máy), phần tử kề cuối là xưởng
        return chain.Count >= 2 && chain[^1].ParentId is null ? chain[^2] : null;
    }

    /// <summary>Đội (TEAM) gần nhất phía trên đơn vị.</summary>
    public OrgUnitDto? GetTeam(int id) =>
        GetAncestors(id).FirstOrDefault(x => x.TypeCode == OrgUnitTypeCodes.Team);

    /// <summary>Đơn vị con cháu (không gồm chính nó), duyệt theo chiều rộng.</summary>
    public IReadOnlyList<OrgUnitDto> GetDescendants(int id)
    {
        var result = new List<OrgUnitDto>();
        var visited = new HashSet<int> { id };
        var pending = new Queue<int>([id]);
        while (pending.TryDequeue(out var parentId))
        {
            foreach (var child in _childrenByParent[parentId])
            {
                if (visited.Add(child.Id))
                {
                    result.Add(child);
                    pending.Enqueue(child.Id);
                }
            }
        }

        return result;
    }

    /// <summary>Tên đơn vị; không tìm thấy thì trả "#Id".</summary>
    public string GetName(int id) => Get(id)?.Name ?? $"#{id}";
}