using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.Organization.Services;

/// <summary>
/// Dựng cây sơ đồ tổ chức từ 2 view: vOrgUnit (đơn vị) + vUnitMember (người).
/// - Mỗi đơn vị (trừ Tổ) là 1 node; hàng của node = ChartRow của cấp trưởng đơn vị.
/// - UnitRole HEAD → Heads (thẻ đại diện); DEPUTY → Deputies (hover; Nhà máy: PGĐ vẽ hàng 2);
///   MEMBER → gộp thành khối theo cấp bậc (Kỹ sư, Chuyên viên, Nhân viên…).
/// - Các Tổ con gộp thành 1 khối "Tổ trưởng" (mỗi Tổ kèm Tổ trưởng; Tổ trống vẫn liệt kê).
/// </summary>
public class OrgChartService(IOrgChartRepository orgChartRepository) : IOrgChartService
{
    private const string LevelBlockKind = "LEVEL";
    private const string GroupsBlockKind = "GROUPS";

    public async Task<OrgChartTreeDto> GetTreeAsync(CancellationToken cancellationToken)
    {
        var units = await orgChartRepository.GetUnitsAsync(cancellationToken);
        var members = await orgChartRepository.GetAllMembersAsync(cancellationToken);
        var levels = (await orgChartRepository.GetPositionLevelsAsync(cancellationToken)).ToDictionary(x => x.Code);

        var root = units.FirstOrDefault(x => x.ParentId is null)
            ?? throw new BusinessException("Chưa có dữ liệu cơ cấu tổ chức.");

        var builder = new TreeBuilder(units, members, levels);

        return new OrgChartTreeDto
        {
            Root = builder.Build(root),
            TotalEmployees = members.Select(x => x.EmployeeId).Distinct().Count(),
            TotalWorkshops = units.Count(x => x.TypeCode == OrgUnitTypeCodes.Workshop),
            TotalTeams = units.Count(x => x.TypeCode == OrgUnitTypeCodes.Team),
            TotalGroups = units.Count(x => x.TypeCode == OrgUnitTypeCodes.Group),
            VacantHeadCount = units.Count(x => !builder.HasHead(x.Id)),
            MaxRow = levels.Count == 0 ? 0 : levels.Values.Max(x => x.ChartRow),
        };
    }

    public async Task<IReadOnlyList<UnitMemberDto>> GetMembersAsync(int orgUnitId, CancellationToken cancellationToken)
    {
        var members = await orgChartRepository.GetMembersByUnitAsync(orgUnitId, cancellationToken);

        return members.Select(x => new UnitMemberDto
        {
            AssignmentId = x.AssignmentId,
            EmployeeId = x.EmployeeId,
            EmpCode = x.EmpCode,
            FullName = x.FullName,
            Email = x.Email,
            Phone = x.Phone,
            AvatarUrl = x.AvatarUrl,
            LevelCode = x.LevelCode,
            LevelName = x.LevelName,
            Rank = x.Rank,
            ChartRow = x.ChartRow,
            UnitRole = x.UnitRole,
            IsActing = x.IsActing,
            IsPrimary = x.IsPrimary,
            JobTitle = x.JobTitle,
            StartDate = x.StartDate,
        }).ToList();
    }

    public async Task<LookupsDto> GetLookupsAsync(CancellationToken cancellationToken)
    {
        var types = await orgChartRepository.GetUnitTypesAsync(cancellationToken);
        var typeParents = await orgChartRepository.GetUnitTypeParentsAsync(cancellationToken);
        var levels = await orgChartRepository.GetPositionLevelsAsync(cancellationToken);
        var disciplines = await orgChartRepository.GetDisciplinesAsync(cancellationToken);

        return new LookupsDto
        {
            OrgUnitTypes = types.Select(x => new OrgUnitTypeDto
            {
                Code = x.Code,
                Name = x.Name,
                HeadLevelCode = x.HeadLevelCode,
                DeputyLevelCode = x.DeputyLevelCode,
                SingleHead = x.SingleHead,
                AllowedParentTypes = typeParents
                    .Where(p => p.ChildTypeCode == x.Code)
                    .Select(p => p.ParentTypeCode)
                    .ToList(),
            }).ToList(),
            PositionLevels = levels.Select(PositionLevelService.ToDto).ToList(),
            Disciplines = disciplines.Select(x => new LookupItemDto { Code = x.Code, Name = x.Name }).ToList(),
        };
    }

    /// <summary>Dựng cây trong bộ nhớ từ danh sách phẳng.</summary>
    private sealed class TreeBuilder(
        IReadOnlyList<VOrgUnit> units,
        IReadOnlyList<VUnitMember> members,
        Dictionary<string, PositionLevel> levels)
    {
        private readonly ILookup<int?, VOrgUnit> _childrenByParent = units.ToLookup(x => x.ParentId);
        private readonly ILookup<int, VUnitMember> _membersByUnit = members.ToLookup(x => x.OrgUnitId);
        private readonly Dictionary<int, int> _headcountCache = [];

        public bool HasHead(int unitId) => _membersByUnit[unitId].Any(x => x.UnitRole == UnitRoles.Head);

        public OrgChartNodeDto Build(VOrgUnit unit)
        {
            var unitMembers = _membersByUnit[unit.Id].ToList();
            var children = _childrenByParent[unit.Id].OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToList();
            var groups = children.Where(x => x.TypeCode == OrgUnitTypeCodes.Group).ToList();
            var subUnits = children.Where(x => x.TypeCode != OrgUnitTypeCodes.Group).ToList();

            var headLevel = GetLevel(unit.HeadLevelCode);
            var deputyLevel = unit.DeputyLevelCode is null ? null : GetLevel(unit.DeputyLevelCode);

            var node = new OrgChartNodeDto
            {
                OrgUnitId = unit.Id,
                Code = unit.Code,
                Name = unit.Name,
                ShortName = unit.ShortName,
                TypeCode = unit.TypeCode,
                TypeName = unit.TypeName,
                ParentId = unit.ParentId,
                Row = headLevel.ChartRow,
                DeputyRow = deputyLevel?.ChartRow,
                DisplayMode = headLevel.DisplayMode,
                HeadLevelCode = headLevel.Code,
                HeadLevelName = headLevel.Name,
                DeputyLevelName = deputyLevel?.Name,
                DisciplineCode = unit.DisciplineCode,
                Area = unit.Area,
                SortOrder = unit.SortOrder,
                TotalHeadcount = GetHeadcount(unit.Id),
                Heads = unitMembers.Where(x => x.UnitRole == UnitRoles.Head).Select(ToPerson).ToList(),
                Deputies = unitMembers.Where(x => x.UnitRole == UnitRoles.Deputy).Select(ToPerson).ToList(),
            };

            // Khối theo cấp bậc cho các thành viên còn lại (Kỹ sư, Chuyên viên, Nhân viên…)
            var blocks = unitMembers
                .Where(x => x.UnitRole == UnitRoles.Member)
                .GroupBy(x => x.LevelCode)
                .Select(g =>
                {
                    var first = g.First();
                    return new OrgChartBlockDto
                    {
                        Key = $"U{unit.Id}-{g.Key}",
                        Kind = LevelBlockKind,
                        Label = first.BlockLabel ?? first.LevelName,
                        LevelCode = g.Key,
                        Row = first.ChartRow,
                        PeopleCount = g.Count(),
                        People = g.Select(ToPerson).ToList(),
                    };
                })
                .ToList();

            // Khối "Tổ trưởng": gộp tất cả Tổ con
            if (groups.Count > 0)
            {
                var groupLevel = GetLevel(groups[0].HeadLevelCode);
                var groupDtos = groups.Select(g => new OrgChartGroupDto
                {
                    OrgUnitId = g.Id,
                    Code = g.Code,
                    Name = g.Name,
                    Shift = g.Shift,
                    Leaders = _membersByUnit[g.Id].Where(x => x.UnitRole == UnitRoles.Head).Select(ToPerson).ToList(),
                }).ToList();

                blocks.Add(new OrgChartBlockDto
                {
                    Key = $"U{unit.Id}-{GroupsBlockKind}",
                    Kind = GroupsBlockKind,
                    Label = groupLevel.BlockLabel ?? groupLevel.Name,
                    LevelCode = groupLevel.Code,
                    Row = groupLevel.ChartRow,
                    GroupCount = groupDtos.Count,
                    PeopleCount = groupDtos.Sum(x => x.Leaders.Count),
                    Groups = groupDtos,
                });
            }

            node.Blocks = blocks.OrderBy(x => x.Row).ThenBy(x => x.Kind).ToList();
            node.Children = subUnits.Select(Build).ToList();
            return node;
        }

        /// <summary>Quân số cả nhánh (gồm người của mọi đơn vị con, kể cả Tổ).</summary>
        private int GetHeadcount(int unitId)
        {
            if (_headcountCache.TryGetValue(unitId, out var cached))
            {
                return cached;
            }

            var total = _membersByUnit[unitId].Count() + _childrenByParent[unitId].Sum(x => GetHeadcount(x.Id));
            _headcountCache[unitId] = total;
            return total;
        }

        private PositionLevel GetLevel(string code) =>
            levels.TryGetValue(code, out var level)
                ? level
                : new PositionLevel { Code = code, Name = code, ChartRow = 0, DisplayMode = DisplayModes.Card };

        private static OrgChartPersonDto ToPerson(VUnitMember member) => new()
        {
            AssignmentId = member.AssignmentId,
            EmployeeId = member.EmployeeId,
            EmpCode = member.EmpCode,
            FullName = member.FullName,
            LevelCode = member.LevelCode,
            LevelName = member.LevelName,
            IsActing = member.IsActing,
            JobTitle = member.JobTitle,
            Email = member.Email,
            Phone = member.Phone,
            AvatarUrl = member.AvatarUrl,
            StartDate = member.StartDate,
        };
    }
}
