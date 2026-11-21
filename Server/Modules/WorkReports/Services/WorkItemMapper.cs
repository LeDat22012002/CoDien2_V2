using Server.Modules.Employees.DTOs;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Map dòng kế hoạch / báo cáo và vật tư sang DTO.</summary>
public static class WorkItemMapper
{
    /// <summary>Id nhân viên xuất hiện trong danh sách người thực hiện (để lấy tên hiện tại theo lô).</summary>
    public static IReadOnlyList<int> CollectEmployeeIds(IEnumerable<WorkItemWorkerBase> workers) =>
        workers
            .Where(x => x.EmployeeId is not null)
            .Select(x => x.EmployeeId!.Value)
            .Distinct()
            .ToList();

    public static WorkPlanItemDto ToDto(
        WorkPlanItem item,
        IReadOnlyDictionary<int, WorkCategory> categories,
        IReadOnlyDictionary<int, EmployeeBriefDto> employees,
        int? tt = null)
    {
        var dto = Common<WorkPlanItemDto, WorkPlanItemWorker>(item, categories, employees, tt);
        dto.PlannedMinutes = item.PlannedMinutes;
        return dto;
    }

    public static WorkReportItemDto ToDto(
        WorkReportItem item,
        IReadOnlyDictionary<int, WorkCategory> categories,
        IReadOnlyDictionary<int, EmployeeBriefDto> employees,
        int? tt = null)
    {
        var dto = Common<WorkReportItemDto, WorkReportItemWorker>(item, categories, employees, tt);
        var effectiveActual = EffectiveActualMinutes(item);
        dto.PlanItemId = item.PlanItemId;
        dto.IsUnplanned = item.PlanItemId is null;
        dto.PlannedMinutes = item.PlannedMinutes;
        dto.ActualMinutes = item.ActualMinutes;
        dto.EffectiveActualMinutes = effectiveActual;
        // (13) Chênh lệch = kế hoạch − thực tế (âm = làm vượt giờ kế hoạch)
        dto.DiffMinutes = (item.PlannedMinutes ?? 0) - effectiveActual;
        dto.ResultPercent = item.ResultPercent;
        dto.WorkPermit = item.WorkPermit;
        dto.FiveS = item.FiveS;
        dto.Explanation = item.Explanation;
        return dto;
    }

    /// <summary>(12) thực tế, chưa nhập thì bằng kế hoạch.</summary>
    public static decimal EffectiveActualMinutes(WorkReportItem item) => item.ActualMinutes ?? item.PlannedMinutes ?? 0;

    public static WorkMaterialDto ToDto(WorkPlanMaterial material, WeeklyForm form, WorkPlanItem? item) => new()
    {
        Id = material.Id,
        WeeklyFormId = material.WeeklyFormId,
        UnitName = form.UnitName,
        WorkItemId = material.WorkPlanItemId,
        WorkItemCode = item?.Code ?? string.Empty,
        WorkItemDescription = item?.Description,
        // KTV của dòng; dòng cũ chưa lưu KTV thì lấy KTV của form
        EngineerNames = EngineerNamesOf(item?.Engineers) ?? form.EngineerNames,
        MaterialCode = material.MaterialCode,
        MaterialName = material.MaterialName,
        Uom = material.Uom,
        PlannedQuantity = material.Quantity,
        EffectiveActualQuantity = material.Quantity,
        UsageDate = material.UsageDate,
        MaterialPurposeId = material.MaterialPurposeId,
        MaterialPurposeCode = material.MaterialPurpose?.Code,
        Note = material.Note,
        UpdatedAt = material.UpdatedAt ?? material.CreatedAt,
        UpdatedBy = material.UpdatedBy ?? material.CreatedBy,
        RowVersion = Convert.ToBase64String(material.RowVersion),
    };

    public static WorkMaterialDto ToDto(WorkReportMaterial material, WeeklyForm form, WorkReportItem? item) => new()
    {
        Id = material.Id,
        WeeklyFormId = material.WeeklyFormId,
        UnitName = form.UnitName,
        WorkItemId = material.WorkReportItemId,
        WorkItemCode = item?.Code ?? string.Empty,
        WorkItemDescription = item?.Description,
        // KTV của dòng; dòng cũ chưa lưu KTV thì lấy KTV của form
        EngineerNames = EngineerNamesOf(item?.Engineers) ?? form.EngineerNames,
        MaterialCode = material.MaterialCode,
        MaterialName = material.MaterialName,
        Uom = material.Uom,
        PlannedQuantity = material.PlannedQuantity,
        ActualQuantity = material.ActualQuantity,
        EffectiveActualQuantity = material.ActualQuantity ?? material.PlannedQuantity,
        UsageDate = material.UsageDate,
        MaterialPurposeId = material.MaterialPurposeId,
        MaterialPurposeCode = material.MaterialPurpose?.Code,
        Note = material.Note,
        IsUnplanned = material.PlanMaterialId is null,
        UpdatedAt = material.UpdatedAt ?? material.CreatedAt,
        UpdatedBy = material.UpdatedBy ?? material.CreatedBy,
        RowVersion = Convert.ToBase64String(material.RowVersion),
    };

    private static string? EngineerNamesOf(IReadOnlyCollection<WorkItemEngineer>? engineers) =>
        engineers is { Count: > 0 } ? string.Join(", ", engineers.Select(x => x.FullName)) : null;

    private static TDto Common<TDto, TWorker>(
        WorkItemBase<TWorker> item,
        IReadOnlyDictionary<int, WorkCategory> categories,
        IReadOnlyDictionary<int, EmployeeBriefDto> employees,
        int? tt)
        where TDto : WorkItemDtoBase, new()
        where TWorker : WorkItemWorkerBase
    {
        var category = categories.GetValueOrDefault(item.WorkCategoryId);
        return new TDto
        {
            Id = item.Id,
            WeeklyFormId = item.WeeklyFormId,
            Tt = tt,
            WorkCategoryId = item.WorkCategoryId,
            CategoryCode = category?.Code ?? string.Empty,
            GroupLetter = category?.GroupLetter ?? string.Empty,
            CategoryName = category?.Name ?? string.Empty,
            Code = item.Code,
            EquipmentId = item.EquipmentId,
            EquipmentCode = item.EquipmentCode,
            EquipmentName = item.EquipmentName,
            Description = item.Description,
            StartDate = item.StartDate,
            EndDate = item.EndDate,
            WorkerCount = item.Workers.Count,
            Workers = item.Workers
                .OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                .Select(x =>
                {
                    // Gắn nhân viên → tên hiện tại; tên gõ tự do giữ nguyên
                    var employee = x.EmployeeId is { } id ? employees.GetValueOrDefault(id) : null;
                    return new WorkItemWorkerDto
                    {
                        EmployeeId = x.EmployeeId,
                        EmpCode = employee?.EmpCode,
                        DisplayName = employee?.FullName ?? x.DisplayName,
                    };
                })
                .ToList(),
            IsWholeUnit = item.IsWholeUnit,
            WholeGroups = item.WholeGroups
                .Select(x => new OrgUnitOptionDto { OrgUnitId = x.OrgUnitId, Name = x.Name })
                .ToList(),
            Engineers = item.Engineers
                .Select(x => new EngineerOptionDto { EmployeeId = x.EmployeeId, FullName = x.FullName })
                .ToList(),
            Note = item.Note,
            SortOrder = item.SortOrder,
            RowVersion = Convert.ToBase64String(item.RowVersion),
            UpdatedAt = item.UpdatedAt ?? item.CreatedAt,
            UpdatedBy = item.UpdatedBy ?? item.CreatedBy,
        };
    }
}