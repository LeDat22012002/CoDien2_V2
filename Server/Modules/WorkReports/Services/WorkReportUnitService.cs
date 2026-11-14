using System.Globalization;
using System.Text;
using Server.Data;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Đơn vị báo cáo (tổ GROUP / kíp SHIFT). Thêm/sửa/sắp xếp: admin hoặc quản đốc/phó của xưởng.
/// Xưởng của đơn vị tính từ cây tổ chức tại thời điểm đọc (tổ chuyển xưởng thì đi theo xưởng mới).
/// </summary>
public class WorkReportUnitService(
    IWorkReportUnitRepository unitRepository,
    IWorkReportUnitEngineerService engineerService,
    IWorkReportScopeService scopeService,
    IOrgTreeProvider orgTreeProvider,
    IUnitOfWork unitOfWork) : IWorkReportUnitService
{
    private const string NotFoundMessage = "Không tìm thấy đơn vị báo cáo.";
    private const int SortOrderStep = 10;

    /// <summary>Loại đơn vị được làm đơn vị báo cáo.</summary>
    private static readonly HashSet<string> ReportableTypes = [OrgUnitTypeCodes.Group, OrgUnitTypeCodes.Shift];

    /// <summary>Từ bỏ đi khi gợi ý tiền tố (đã bỏ dấu, viết hoa).</summary>
    private static readonly HashSet<string> PrefixStopWords = ["TO", "KIP", "NHOM", "THEO", "CA", "DOI"];

    public async Task<IReadOnlyList<WorkReportUnitDto>> GetListAsync(
        WorkReportUnitFilterRequest filter, CancellationToken cancellationToken)
    {
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var units = (await unitRepository.GetListAsync(filter.IncludeInactive, cancellationToken))
            .Where(x => filter.WorkshopId is not { } workshopId || tree.GetWorkshop(x.OrgUnitId)?.Id == workshopId)
            .ToList();

        var engineers = await engineerService.GetActiveByUnitAsync(
            units.Select(x => x.Id).ToList(), cancellationToken);

        var result = new List<WorkReportUnitDto>();
        foreach (var unit in units)
        {
            result.Add(await ToDtoAsync(unit, tree, engineers, cancellationToken));
        }

        // Theo thứ tự xưởng trên sơ đồ rồi thứ tự trong xưởng
        var workshopOrder = tree.GetWorkshops().Select((x, index) => (x.Id, index)).ToDictionary(x => x.Id, x => x.index);
        return result
            .OrderBy(x => x.WorkshopId is { } id ? workshopOrder.GetValueOrDefault(id, int.MaxValue) : int.MaxValue)
            .ThenBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToList();
    }

    public async Task<WorkReportUnitDto> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var unit = await unitRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(NotFoundMessage);
        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var engineers = await engineerService.GetActiveByUnitAsync([id], cancellationToken);

        return await ToDtoAsync(unit, tree, engineers, cancellationToken);
    }

    public async Task<IReadOnlyList<UnconfiguredOrgUnitDto>> GetUnconfiguredAsync(
        int workshopId, CancellationToken cancellationToken)
    {
        await EnsureCanManageWorkshopAsync(workshopId, cancellationToken);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var workshop = tree.Get(workshopId) ?? throw new NotFoundException("Không tìm thấy xưởng.");
        var configuredOrgUnitIds = (await unitRepository.GetListAsync(includeInactive: true, cancellationToken))
            .Select(x => x.OrgUnitId)
            .ToHashSet();

        return tree.GetDescendants(workshopId)
            .Where(x => x.IsActive && ReportableTypes.Contains(x.TypeCode) && !configuredOrgUnitIds.Contains(x.Id))
            .Select(x => new UnconfiguredOrgUnitDto
            {
                OrgUnitId = x.Id,
                OrgUnitCode = x.Code,
                OrgUnitName = x.Name,
                OrgUnitTypeCode = x.TypeCode,
                Shift = x.Shift,
                TeamName = tree.GetTeam(x.Id)?.Name,
                WorkshopId = workshop.Id,
                WorkshopName = workshop.Name,
                SuggestedDisplayName = x.Name,
                SuggestedCodePrefix = SuggestCodePrefix(x),
                SuggestedLaborType = x.TypeCode == OrgUnitTypeCodes.Shift ? LaborTypes.Shift : LaborTypes.Hc,
            })
            .ToList();
    }

    public async Task<WorkReportUnitDto> CreateAsync(
        CreateWorkReportUnitRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        WorkReportUnitRequestValidator.Validate(request);

        var tree = await orgTreeProvider.GetAsync(cancellationToken);
        var orgUnit = tree.Get(request.OrgUnitId);
        if (orgUnit is null || !orgUnit.IsActive || !ReportableTypes.Contains(orgUnit.TypeCode))
        {
            throw FieldError("orgUnitId", "Chỉ chọn được tổ hoặc kíp đang hoạt động trên sơ đồ tổ chức.");
        }

        var workshop = tree.GetWorkshop(orgUnit.Id)
            ?? throw new BusinessException("Tổ/kíp chưa thuộc xưởng nào trên sơ đồ tổ chức.");
        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        if (await unitRepository.IsOrgUnitConfiguredAsync(orgUnit.Id, cancellationToken))
        {
            throw new BusinessException($"'{orgUnit.Name}' đã là đơn vị báo cáo.");
        }

        var unitsInWorkshop = await GetUnitsInWorkshopAsync(workshop.Id, tree, cancellationToken);
        EnsureCodePrefixAvailable(request.CodePrefix, null, unitsInWorkshop);

        var unit = new WorkReportUnit
        {
            OrgUnitId = orgUnit.Id,
            DisplayName = request.DisplayName ?? orgUnit.Name,
            CodePrefix = request.CodePrefix,
            LaborType = request.LaborType,
            SortOrder = request.SortOrder
                        ?? (unitsInWorkshop.Count == 0 ? 0 : unitsInWorkshop.Max(x => x.SortOrder)) + SortOrderStep,
            IsActive = true,
        };

        unitRepository.Add(unit);
        await unitOfWork.SaveChangesAsync(cancellationToken);

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
            ?? throw new BusinessException("Tổ/kíp chưa thuộc xưởng nào trên sơ đồ tổ chức.");
        await EnsureCanManageWorkshopAsync(workshop.Id, cancellationToken);

        var unitsInWorkshop = await GetUnitsInWorkshopAsync(workshop.Id, tree, cancellationToken);
        EnsureCodePrefixAvailable(request.CodePrefix, id, unitsInWorkshop);

        // Đổi tiền tố chỉ áp dụng cho mã sinh sau này; mã công việc đã sinh giữ nguyên
        unit.DisplayName = request.DisplayName ?? tree.Get(unit.OrgUnitId)?.Name ?? unit.DisplayName;
        unit.CodePrefix = request.CodePrefix;
        unit.LaborType = request.LaborType;
        unit.IsActive = request.IsActive;
        await unitOfWork.SaveChangesAsync(cancellationToken);

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

    private async Task<WorkReportUnitDto> ToDtoAsync(
        WorkReportUnit unit,
        OrgTree tree,
        IReadOnlyDictionary<int, IReadOnlyList<WorkReportUnitEngineerDto>> engineers,
        CancellationToken cancellationToken)
    {
        var orgUnit = tree.Get(unit.OrgUnitId);
        var workshop = tree.GetWorkshop(unit.OrgUnitId);
        var team = tree.GetTeam(unit.OrgUnitId);
        var access = await scopeService.GetUnitAccessAsync(unit, cancellationToken);

        return new WorkReportUnitDto
        {
            Id = unit.Id,
            OrgUnitId = unit.OrgUnitId,
            OrgUnitCode = orgUnit?.Code ?? string.Empty,
            OrgUnitName = orgUnit?.Name ?? string.Empty,
            OrgUnitTypeCode = orgUnit?.TypeCode ?? string.Empty,
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
            CanManageEngineers = access.CanManageEngineers,
        };
    }

    /// <summary>Mọi đơn vị báo cáo (kể cả ngừng dùng) đang thuộc xưởng.</summary>
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

    /// <summary>
    /// Gợi ý tiền tố từ tên viết tắt (hoặc tên): bỏ dấu, bỏ các từ "Tổ/Kíp/Nhóm/theo ca/Đội";
    /// còn 1 cụm thì giữ nguyên (vd "CK-TBMP"), nhiều cụm thì lấy chữ cái đầu (vd "cơ điện B" → "CDB").
    /// </summary>
    private static string SuggestCodePrefix(OrgUnitDto orgUnit)
    {
        var source = RemoveDiacritics(orgUnit.ShortName ?? orgUnit.Name).ToUpperInvariant();
        var words = source
            .Split(new[] { ' ', '_', ',', '(', ')' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(x => !PrefixStopWords.Contains(x))
            .ToList();

        var prefix = words.Count switch
        {
            0 => orgUnit.Code,
            1 => words[0],
            _ => string.Concat(words.Select(x => x[0])),
        };

        // Kíp: thêm ca nếu chưa có ở cuối
        if (orgUnit.Shift is { Length: > 0 } shift && !prefix.EndsWith(shift, StringComparison.OrdinalIgnoreCase))
        {
            prefix += shift.ToUpperInvariant();
        }

        prefix = new string(prefix.Where(c => char.IsLetterOrDigit(c) || c is '-' or '.').ToArray());
        return prefix.Length > WorkReportUnitRequestValidator.CodePrefixMaxLength
            ? prefix[..WorkReportUnitRequestValidator.CodePrefixMaxLength]
            : prefix;
    }

    private static string RemoveDiacritics(string value)
    {
        var normalized = value.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
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