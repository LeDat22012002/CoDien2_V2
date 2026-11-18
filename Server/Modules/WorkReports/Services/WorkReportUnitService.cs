using Server.Data;
using Server.Modules.Organization.Entities;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Đơn vị báo cáo. Mặc định = tổ/kíp trên sơ đồ (IWorkReportUnitSyncService tự tạo); thêm đơn vị tự đặt / sửa / xóa /
/// khôi phục / sắp xếp: admin hoặc quản đốc/phó của xưởng.
/// Xưởng của đơn vị tính từ cây tổ chức tại thời điểm đọc (tổ chuyển xưởng thì đi theo xưởng mới).
/// Thêm / bật lại / sửa / khôi phục đơn vị → đồng bộ form của tuần đang làm việc ngay (không chờ tác vụ nền).
/// </summary>
public class WorkReportUnitService(
    IWorkReportUnitRepository unitRepository,
    IWeeklyFormRepository formRepository,
    IWorkWeekRepository weekRepository,
    IWorkReportUnitSyncService unitSyncService,
    IWorkReportUnitEngineerService engineerService,
    IWorkReportScopeService scopeService,
    IWeeklyFormService weeklyFormService,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork) : IWorkReportUnitService
{
    private const string NotFoundMessage = "Không tìm thấy đơn vị báo cáo.";
    private const int SortOrderStep = 10;

    public async Task<IReadOnlyList<WorkReportUnitDto>> GetListAsync(
        WorkReportUnitFilterRequest filter, CancellationToken cancellationToken)
    {
        // Xem 1 tuần đã khóa: danh sách tổ/kíp + kỹ sư đúng như tuần đó (thay đổi chỉ áp từ tuần còn mở trở đi)
        if (filter is { WeekId: { } weekId, WorkshopId: { } snapshotWorkshopId })
        {
            var week = await weekRepository.GetByIdAsync(weekId, cancellationToken)
                ?? throw new NotFoundException("Không tìm thấy kỳ tuần.");
            if (DateTime.Now > WorkWeekService.GetEffectiveDeadlines(week, snapshotWorkshopId).Report)
            {
                return await GetWeekSnapshotAsync(week, snapshotWorkshopId, cancellationToken);
            }
        }

        // Tổ/kíp mới trên sơ đồ → đơn vị báo cáo + form ngay khi mở danh sách
        var createdIds = await unitSyncService.EnsureFromOrgChartAsync(filter.WorkshopId, cancellationToken);
        if (createdIds.Count > 0)
        {
            await weeklyFormService.SyncFormsAsync(createdIds, cancellationToken);
        }

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var units = (await unitRepository.GetListAsync(filter.IncludeInactive, cancellationToken))
            .Where(x => filter.WorkshopId is not { } workshopId || tree.GetWorkshop(x.OrgUnitId)?.Id == workshopId)
            .ToList();

        var result = await ToDtosAsync(units, tree, cancellationToken);

        // Theo thứ tự xưởng trên sơ đồ rồi thứ tự trong xưởng
        var workshopOrder = tree.GetWorkshops().Select((x, index) => (x.Id, index)).ToDictionary(x => x.Id, x => x.index);
        return result
            .OrderBy(x => x.WorkshopId is { } id ? workshopOrder.GetValueOrDefault(id, int.MaxValue) : int.MaxValue)
            .ThenBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToList();
    }

    /// <summary>
    /// Tổ/kíp của 1 tuần đã khóa: lấy từ form của tuần (kể cả đơn vị đã ngừng dùng / xóa sau đó), tên / tiền tố /
    /// giờ công theo bản chụp, kỹ sư = người phụ trách trong tuần; chỉ xem.
    /// </summary>
    private async Task<IReadOnlyList<WorkReportUnitDto>> GetWeekSnapshotAsync(
        WorkWeek week, int workshopId, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var forms = (await formRepository.GetByWeekAndWorkshopAsync(week.Id, workshopId, cancellationToken))
            .OrderBy(x => x.WorkReportUnit.SortOrder).ThenBy(x => x.WorkReportUnitId)
            .ToList();
        var engineers = await engineerService.GetByUnitInRangeAsync(
            forms.Select(x => x.WorkReportUnitId).ToList(), week.StartDate, week.EndDate, cancellationToken);
        var workshop = tree.Get(workshopId);

        return forms.Select(form =>
        {
            var unit = form.WorkReportUnit;
            var orgUnit = tree.Get(unit.OrgUnitId);
            var team = tree.GetTeam(unit.OrgUnitId);
            return new WorkReportUnitDto
            {
                Id = unit.Id,
                OrgUnitId = unit.OrgUnitId,
                OrgUnitCode = orgUnit?.Code ?? string.Empty,
                OrgUnitName = orgUnit?.Name ?? string.Empty,
                OrgUnitTypeCode = orgUnit?.TypeCode ?? string.Empty,
                IsCustom = unit.IsCustom,
                Shift = orgUnit?.Shift,
                IsOrgUnitActive = orgUnit?.IsActive ?? false,
                TeamId = team?.Id,
                TeamName = team?.Name,
                WorkshopId = workshopId,
                WorkshopName = workshop?.Name,
                DisplayName = form.UnitName,
                CodePrefix = form.CodePrefix,
                LaborType = form.LaborType,
                SortOrder = unit.SortOrder,
                IsActive = true,
                Engineers = engineers.GetValueOrDefault(unit.Id, []),
                CanConfigure = false,
                CanManageEngineers = false,
                IsWeekSnapshot = true,
                WeekId = week.Id,
            };
        }).ToList();
    }

    public async Task<WorkReportUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        return (await ToDtosAsync([unit], tree, cancellationToken))[0];
    }

    public async Task<IReadOnlyList<WorkReportUnitDto>> GetDeletedAsync(int workshopId, CancellationToken cancellationToken)
    {
        var tree = await GetWorkshopTreeAsync(workshopId, cancellationToken);
        await EnsureCanManageWorkshopAsync(workshopId, cancellationToken);

        var units = (await unitRepository.GetAllIncludingDeletedAsync(cancellationToken))
            .Where(x => x.IsDeleted && tree.GetWorkshop(x.OrgUnitId)?.Id == workshopId)
            .OrderBy(x => x.DisplayName)
            .ToList();

        return await ToDtosAsync(units, tree, cancellationToken);
    }

    public async Task<IReadOnlyList<WorkReportUnitParentOptionDto>> GetParentOptionsAsync(
        int workshopId, CancellationToken cancellationToken)
    {
        var tree = await GetWorkshopTreeAsync(workshopId, cancellationToken);
        await EnsureCanManageWorkshopAsync(workshopId, cancellationToken);

        var workshop = tree.Get(workshopId)!;
        return new[] { new WorkReportUnitParentOptionDto { OrgUnitId = workshop.Id, Name = workshop.Name, IsWorkshop = true } }
            .Concat(tree.GetDescendants(workshopId)
                .Where(x => x.IsActive && x.TypeCode == OrgUnitTypeCodes.Team)
                .Select(x => new WorkReportUnitParentOptionDto { OrgUnitId = x.Id, Name = x.Name }))
            .ToList();
    }

    public async Task<WorkReportUnitDto> CreateAsync(
        CreateWorkReportUnitRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        WorkReportUnitRequestValidator.Validate(request);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var parent = tree.Get(request.ParentOrgUnitId);
        var workshop = parent is null ? null : tree.GetWorkshop(parent.Id);
        if (parent is null || !parent.IsActive || workshop is null
            || (parent.Id != workshop.Id && parent.TypeCode != OrgUnitTypeCodes.Team))
        {
            throw FieldError("parentOrgUnitId", "Chỉ gắn được với xưởng hoặc đội đang hoạt động trên sơ đồ tổ chức.");
        }

        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        var unitsInWorkshop = await GetUnitsInWorkshopAsync(workshop.Id, tree, cancellationToken);
        EnsureCodePrefixAvailable(request.CodePrefix, null, unitsInWorkshop);

        var unit = new WorkReportUnit
        {
            OrgUnitId = parent.Id,
            IsCustom = true,
            DisplayName = request.DisplayName!,
            CodePrefix = request.CodePrefix,
            LaborType = request.LaborType,
            SortOrder = (unitsInWorkshop.Count == 0 ? 0 : unitsInWorkshop.Max(x => x.SortOrder)) + SortOrderStep,
            IsActive = true,
        };

        unitRepository.Add(unit);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Tạo form cho tuần đang chạy (báo cáo chưa khóa) và tuần kế hoạch
        await weeklyFormService.SyncFormsAsync([unit.Id], cancellationToken);

        return await GetByIdAsync(unit.Id, cancellationToken);
    }

    public async Task<WorkReportUnitDto> UpdateAsync(
        int id, UpdateWorkReportUnitRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        WorkReportUnitRequestValidator.Validate(request);

        var unit = await unitRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshop = tree.GetWorkshop(unit.OrgUnitId)
            ?? throw new BusinessException("Đơn vị chưa thuộc xưởng nào trên sơ đồ tổ chức.");
        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        // Bật lại đơn vị: đơn vị gốc trên sơ đồ phải còn hoạt động
        var orgUnit = tree.Get(unit.OrgUnitId);
        if (request.IsActive && !unit.IsActive && (orgUnit is null || !orgUnit.IsActive))
        {
            throw new BusinessException(
                $"'{orgUnit?.Name ?? unit.DisplayName}' đã ngừng trên sơ đồ tổ chức, không bật lại đơn vị báo cáo được.");
        }

        if (unit.IsCustom && request.DisplayName is null)
        {
            throw FieldError("displayName", "Tên đơn vị không được để trống.");
        }

        var unitsInWorkshop = await GetUnitsInWorkshopAsync(workshop.Id, tree, cancellationToken);
        EnsureCodePrefixAvailable(request.CodePrefix, id, unitsInWorkshop);

        // Đổi tiền tố chỉ áp dụng cho form chưa cấp mã; mã công việc đã sinh giữ nguyên
        unit.DisplayName = request.DisplayName ?? orgUnit?.Name ?? unit.DisplayName;
        unit.CodePrefix = request.CodePrefix;
        unit.LaborType = request.LaborType;
        unit.IsActive = request.IsActive;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        // Cập nhật tên / loại giờ công của form chưa khóa; bật lại → tạo form; ngừng → bỏ form trống tuần sau
        await weeklyFormService.SyncFormsAsync([id], cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshop = tree.GetWorkshop(unit.OrgUnitId)
            ?? throw new BusinessException("Đơn vị chưa thuộc xưởng nào trên sơ đồ tổ chức.");
        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        if (await unitRepository.HasDataAsync(id, cancellationToken))
        {
            throw new BusinessException(
                $"'{unit.DisplayName}' đã có kế hoạch / báo cáo, không xóa được để giữ lịch sử. Hãy chuyển sang \"Ngừng dùng\".");
        }

        var now = DateTime.Now;
        var today = DateOnly.FromDateTime(now);

        await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            // Chỉ áp từ tuần còn mở trở đi: bỏ form (trống) của tuần báo cáo chưa quá hạn;
            // form của tuần đã khóa giữ nguyên để tuần đó hiện đúng như lúc chốt
            foreach (var form in await unitRepository.FindFormsAsync(id, ct))
            {
                if (now <= WorkWeekService.GetEffectiveDeadlines(form.WorkWeek, form.WorkshopId).Report)
                {
                    unitRepository.RemoveForm(form);
                }
            }

            // Phân công kỹ sư: kết thúc chứ không xóa, để kỹ sư vẫn xem lại được các tuần đã phụ trách.
            // Phân công bắt đầu từ hôm nay trở đi chưa có hiệu lực ngày nào thì bỏ hẳn.
            foreach (var engineer in await unitRepository.FindAllEngineersAsync(id, ct))
            {
                if (engineer.StartDate >= today)
                {
                    unitRepository.RemoveEngineer(engineer);
                }
                else if (engineer.EndDate is null || engineer.EndDate >= today)
                {
                    engineer.EndDate = today.AddDays(-1);
                }
            }

            // Xóa mềm bằng cờ, không gọi Remove: đơn vị còn form tuần đã khóa và phân công kỹ sư (đã kết thúc) đang được
            // theo dõi, Remove khiến EF xử lý quan hệ bắt buộc như xóa thật và báo lỗi "association has been severed".
            // Tổ/kíp theo sơ đồ giữ dòng đã xóa để không tự tạo lại.
            unit.IsDeleted = true;
            await unitOfWork.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task<WorkReportUnitDto> RestoreAsync(int id, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.FindDeletedByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy đơn vị báo cáo đã xóa.");

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var orgUnit = tree.Get(unit.OrgUnitId);
        var workshop = tree.GetWorkshop(unit.OrgUnitId);
        if (orgUnit is null || !orgUnit.IsActive || workshop is null)
        {
            throw new BusinessException(
                $"'{orgUnit?.Name ?? unit.DisplayName}' đã ngừng trên sơ đồ tổ chức, không khôi phục được.");
        }

        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        // Tiền tố đã bị đơn vị khác dùng trong lúc bị xóa → tự thêm hậu tố
        var unitsInWorkshop = await GetUnitsInWorkshopAsync(workshop.Id, tree, cancellationToken);
        var usedPrefixes = new HashSet<string>(unitsInWorkshop.Select(x => x.CodePrefix), StringComparer.OrdinalIgnoreCase);

        unit.IsDeleted = false;
        unit.IsActive = true;
        unit.CodePrefix = WorkReportUnitPrefixes.MakeUnique(unit.CodePrefix, usedPrefixes);
        unit.SortOrder = (unitsInWorkshop.Count == 0 ? 0 : unitsInWorkshop.Max(x => x.SortOrder)) + SortOrderStep;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        await weeklyFormService.SyncFormsAsync([id], cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task ReorderAsync(ReorderWorkReportUnitsRequest request, CancellationToken cancellationToken)
    {
        await EnsureCanManageWorkshopAsync(request.WorkshopId, cancellationToken);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var unitIds = (await GetUnitsInWorkshopAsync(request.WorkshopId, tree, cancellationToken))
            .Select(x => x.Id)
            .ToHashSet();
        var orderedIds = request.OrderedIds ?? [];

        if (orderedIds.Count != unitIds.Count || orderedIds.Distinct().Count() != orderedIds.Count
            || !orderedIds.All(unitIds.Contains))
        {
            throw new BusinessException(
                "Danh sách sắp xếp phải gồm đủ các đơn vị báo cáo của xưởng. Hãy tải lại trang rồi thử lại.");
        }

        var units = (await unitRepository.FindByIdsAsync(orderedIds, cancellationToken)).ToDictionary(x => x.Id);
        for (var i = 0; i < orderedIds.Count; i++)
        {
            units[orderedIds[i]].SortOrder = (i + 1) * SortOrderStep;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<WorkReportUnitDto>> ToDtosAsync(
        IReadOnlyList<WorkReportUnit> units, OrgTree tree, CancellationToken cancellationToken)
    {
        var engineers = await engineerService.GetActiveByUnitAsync(
            units.Where(x => !x.IsDeleted).Select(x => x.Id).ToList(), cancellationToken);

        var result = new List<WorkReportUnitDto>();
        foreach (var unit in units)
        {
            var orgUnit = tree.Get(unit.OrgUnitId);
            var workshop = tree.GetWorkshop(unit.OrgUnitId);
            var team = tree.GetTeam(unit.OrgUnitId);
            var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);

            result.Add(new WorkReportUnitDto
            {
                Id = unit.Id,
                OrgUnitId = unit.OrgUnitId,
                OrgUnitCode = orgUnit?.Code ?? string.Empty,
                OrgUnitName = orgUnit?.Name ?? string.Empty,
                OrgUnitTypeCode = orgUnit?.TypeCode ?? string.Empty,
                IsCustom = unit.IsCustom,
                Shift = orgUnit?.Shift,
                IsOrgUnitActive = orgUnit?.IsActive ?? false,
                TeamId = team?.Id,
                TeamName = team?.Name,
                WorkshopId = workshop?.Id,
                WorkshopName = workshop?.Name,
                DisplayName = unit.DisplayName,
                CodePrefix = unit.CodePrefix,
                LaborType = unit.LaborType,
                SortOrder = unit.SortOrder,
                IsActive = unit.IsActive,
                Engineers = engineers.GetValueOrDefault(unit.Id, []),
                CanConfigure = access.CanConfigure,
                CanManageEngineers = !unit.IsDeleted && access.CanManageEngineers,
            });
        }

        return result;
    }

    private async Task<OrgTree> GetWorkshopTreeAsync(int workshopId, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        if (tree.Get(workshopId) is null || tree.GetWorkshop(workshopId)?.Id != workshopId)
        {
            throw new NotFoundException("Không tìm thấy xưởng.");
        }

        return tree;
    }

    /// <summary>Mọi đơn vị báo cáo (kể cả ngừng dùng, không gồm đã xóa) đang thuộc xưởng.</summary>
    private async Task<IReadOnlyList<WorkReportUnit>> GetUnitsInWorkshopAsync(
        int workshopId, OrgTree tree, CancellationToken cancellationToken) =>
        (await unitRepository.GetListAsync(includeInactive: true, cancellationToken))
        .Where(x => tree.GetWorkshop(x.OrgUnitId)?.Id == workshopId)
        .ToList();

    private async Task EnsureCanManageWorkshopAsync(int workshopId, CancellationToken cancellationToken)
    {
        if (!await scopeService.CanManageWorkshopAsync(workshopId, cancellationToken))
        {
            throw new ForbiddenException("Chỉ quản đốc / phó quản đốc của xưởng hoặc quản trị viên được cấu hình đơn vị báo cáo.");
        }
    }

    private static void EnsureCodePrefixAvailable(
        string codePrefix, int? exceptId, IEnumerable<WorkReportUnit> unitsInWorkshop)
    {
        var duplicate = unitsInWorkshop.FirstOrDefault(
            x => x.Id != exceptId && string.Equals(x.CodePrefix, codePrefix, StringComparison.OrdinalIgnoreCase));
        if (duplicate is not null)
        {
            throw FieldError("codePrefix", $"Tiền tố '{codePrefix}' đã dùng cho '{duplicate.DisplayName}' trong xưởng.");
        }
    }

    private static void Normalize(WorkReportUnitRequestBase request)
    {
        request.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        request.CodePrefix = request.CodePrefix?.Trim().ToUpperInvariant() ?? string.Empty;
        request.LaborType = request.LaborType?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    private static ValidationException FieldError(string field, string message) =>
        new("Dữ liệu không hợp lệ.", new Dictionary<string, string[]> { [field] = [message] });
}