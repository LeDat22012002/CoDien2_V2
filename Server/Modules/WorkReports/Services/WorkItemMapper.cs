using Server.Modules.Employees.DTOs;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;

namespace Server.Modules.WorkReports.Services;

/// <summary>Map dòng công việc / vật tư sang DTO (dùng chung cho lưới, thêm/sửa, dán Excel, vật tư).</summary>
public static class WorkItemMapper
{
    /// <summary>Id nhân viên xuất hiện trong danh sách người thực hiện (để lấy tên hiện tại theo lô).</summary>
    public static IReadOnlyList<int> CollectEmployeeIds(IEnumerable<WorkItem> items) =>
        items.SelectMany(x => x.Workers)
            .Where(x => x.EmployeeId is not null)
            .Select(x => x.EmployeeId!.Value)
            .Distinct()
            .ToList();

    public static WorkItemDto ToDto(
        WorkItem item,
        IReadOnlyDictionary<int, WorkCategory> categories,
        IReadOnlyDictionary<int, EmployeeBriefDto> employees,
        int? tt = null)
    {
        var category = categories.GetValueOrDefault(item.WorkCategoryId);
        var planned = item.PlannedMinutes ?? 0;
        var effectiveActual = item.ActualMinutes ?? item.PlannedMinutes ?? 0;

        return new WorkItemDto
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
            WorkDate = item.WorkDate,
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
            PlannedMinutes = item.PlannedMinutes,
            ActualMinutes = item.ActualMinutes,
            EffectiveActualMinutes = effectiveActual,
            DiffMinutes = effectiveActual - planned,
            ResultPercent = item.ResultPercent,
            WorkPermit = item.WorkPermit,
            FiveS = item.FiveS,
            Explanation = item.Explanation,
            Note = item.Note,
            IsUnplanned = item.IsUnplanned,
            SortOrder = item.SortOrder,
            RowVersion = Convert.ToBase64String(item.RowVersion),
            UpdatedAt = item.UpdatedAt ?? item.CreatedAt,
            UpdatedBy = item.UpdatedBy ?? item.CreatedBy,
        };
    }

    public static WorkMaterialDto ToDto(WorkMaterial material, WeeklyForm form) => new()
    {
        Id = material.Id,
        WeeklyFormId = material.WeeklyFormId,
        UnitName = form.UnitName,
        WorkItemId = material.WorkItemId,
        WorkItemCode = material.WorkItem?.Code ?? string.Empty,
        WorkItemDescription = material.WorkItem?.Description,
        EngineerNames = form.EngineerNames,
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
        IsUnplanned = material.IsUnplanned,
        UpdatedAt = material.UpdatedAt ?? material.CreatedAt,
        UpdatedBy = material.UpdatedBy ?? material.CreatedBy,
    };
}
