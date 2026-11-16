using Server.Modules.Employees.DTOs;
using Server.Modules.Employees.Services.Interfaces;
using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Services.Interfaces;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>Danh mục đầu mục + nhân viên đã nạp sẵn để map nhiều dòng sang DTO.</summary>
public sealed record WorkItemLookups(
    IReadOnlyDictionary<int, WorkCategory> Categories,
    IReadOnlyDictionary<int, EmployeeBriefDto> Employees);

/// <summary>
/// Phần dùng chung khi ghi dòng kế hoạch / báo cáo: chuẩn hóa, kiểm tra đầu mục, người thực hiện, thiết bị,
/// rowVersion, gán trường chung, nạp dữ liệu để map DTO. Scoped, chỉ dùng trong các service của module.
/// </summary>
public class WorkItemSupport(
    IWorkCategoryRepository categoryRepository,
    IEmployeeService employeeService,
    IEquipmentService equipmentService)
{
    public const int SortOrderStep = 10;

    public async Task<WorkCategory> GetUsableCategoryAsync(int categoryId, int workshopId, CancellationToken cancellationToken)
    {
        var category = await categoryRepository.GetByIdAsync(categoryId, cancellationToken);
        if (category is null || !WeeklyFormService.IsCategoryUsable(category, workshopId))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workCategoryId"] = ["Đầu mục không tồn tại, đã ngừng dùng hoặc không áp dụng cho xưởng này."],
            });
        }

        return category;
    }

    /// <summary>Người thực hiện: chọn nhân viên (kiểm tra tồn tại, tên trống = họ tên nhân viên) hoặc tên gõ tự do.</summary>
    public async Task<IReadOnlyList<(int? EmployeeId, string DisplayName)>> BuildWorkersAsync(
        IReadOnlyList<WorkItemWorkerRequest> workers, CancellationToken cancellationToken)
    {
        var employeeIds = workers.Where(x => x.EmployeeId is not null).Select(x => x.EmployeeId!.Value).Distinct().ToList();
        var employees = employeeIds.Count == 0
            ? new Dictionary<int, EmployeeBriefDto>()
            : (await employeeService.GetBriefsAsync(employeeIds, cancellationToken)).ToDictionary(x => x.Id);

        if (employeeIds.Any(x => !employees.ContainsKey(x)))
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["workers"] = ["Có người thực hiện không tồn tại trong danh sách nhân viên."],
            });
        }

        return workers
            .Select(x => (x.EmployeeId,
                x.DisplayName ?? (x.EmployeeId is { } id ? employees[id].FullName : string.Empty)))
            .ToList();
    }

    /// <summary>Mã có trong danh mục thiết bị → gắn Id; không có → gõ tự do.</summary>
    public async Task<EquipmentDto?> ResolveEquipmentAsync(string? code, CancellationToken cancellationToken) =>
        code is null ? null : await equipmentService.GetByCodeAsync(code, cancellationToken);

    /// <summary>Đầu mục (cả đã ngừng) + tên hiện tại của nhân viên trong các danh sách người thực hiện.</summary>
    public async Task<WorkItemLookups> LoadLookupsAsync(
        IEnumerable<WorkItemWorkerBase> workers, CancellationToken cancellationToken)
    {
        var categories = (await categoryRepository.GetListAsync(includeInactive: true, cancellationToken))
            .ToDictionary(x => x.Id);
        var employeeIds = WorkItemMapper.CollectEmployeeIds(workers);
        var employees = employeeIds.Count == 0
            ? new Dictionary<int, EmployeeBriefDto>()
            : (await employeeService.GetBriefsAsync(employeeIds, cancellationToken)).ToDictionary(x => x.Id);
        return new WorkItemLookups(categories, employees);
    }

    /// <summary>Chuẩn hóa phần chung; ngày kết thúc trống = ngày bắt đầu.</summary>
    public static void NormalizeCommon(WorkItemRequestBase request)
    {
        request.EquipmentCode = TextNormalizer.TrimToNull(request.EquipmentCode);
        request.EquipmentName = TextNormalizer.TrimToNull(request.EquipmentName);
        request.Description = request.Description?.Trim() ?? string.Empty;
        request.Note = TextNormalizer.TrimToNull(request.Note);
        request.EndDate ??= request.StartDate;
        request.Workers = (request.Workers ?? [])
            .Select(x => new WorkItemWorkerRequest
            {
                EmployeeId = x.EmployeeId is > 0 ? x.EmployeeId : null,
                DisplayName = TextNormalizer.TrimToNull(x.DisplayName),
            })
            .Where(x => x.EmployeeId is not null || x.DisplayName is not null)
            .ToList();
    }

    public static decimal? RoundOrNull(decimal? value) => value is { } number ? Math.Round(number, 2) : null;

    /// <summary>Gán trường chung (đầu mục và mã gán riêng).</summary>
    public static void ApplyCommonFields<TWorker>(
        WorkItemBase<TWorker> item,
        WorkItemRequestBase request,
        EquipmentDto? equipment,
        IReadOnlyList<(int? EmployeeId, string DisplayName)> workers,
        Func<TWorker> createWorker)
        where TWorker : WorkItemWorkerBase
    {
        item.EquipmentId = equipment?.Id;
        item.EquipmentCode = equipment?.Code ?? request.EquipmentCode;
        item.EquipmentName = request.EquipmentName ?? equipment?.Name;
        item.Description = request.Description;
        item.StartDate = request.StartDate!.Value;
        item.EndDate = request.EndDate ?? request.StartDate.Value;
        item.Note = request.Note;
        SetWorkers(item, workers, createWorker);
    }

    /// <summary>Ghi lại danh sách người thực hiện nếu có thay đổi (bảng con, xóa cứng).</summary>
    public static void SetWorkers<TWorker>(
        WorkItemBase<TWorker> item,
        IReadOnlyList<(int? EmployeeId, string DisplayName)> workers,
        Func<TWorker> createWorker)
        where TWorker : WorkItemWorkerBase
    {
        var current = item.Workers.OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
            .Select(x => (x.EmployeeId, x.DisplayName))
            .ToList();
        if (current.SequenceEqual(workers))
        {
            return;
        }

        item.Workers.Clear();
        for (var i = 0; i < workers.Count; i++)
        {
            var worker = createWorker();
            worker.EmployeeId = workers[i].EmployeeId;
            worker.DisplayName = workers[i].DisplayName;
            worker.SortOrder = i + 1;
            item.Workers.Add(worker);
        }
    }

    public static byte[] ParseRowVersion(string? rowVersion)
    {
        try
        {
            var bytes = string.IsNullOrWhiteSpace(rowVersion) ? [] : Convert.FromBase64String(rowVersion);
            if (bytes.Length > 0)
            {
                return bytes;
            }
        }
        catch (FormatException)
        {
            // Báo lỗi bên dưới
        }

        throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
        {
            ["rowVersion"] = ["Thiếu hoặc sai rowVersion của dòng; hãy tải lại dữ liệu rồi sửa."],
        });
    }

    /// <summary>GPLV: "Có" / "Không" / trống; nhận "co", "CÓ", "x", "Đã có GPLV", "ko", "chưa có"…</summary>
    public static bool TryParseWorkPermit(string? raw, out string? value)
    {
        value = null;
        var key = TextNormalizer.ToKey(raw);
        if (key.Length == 0)
        {
            return true;
        }

        if (key is "k" or "ko" or "no" or "n" or "-" || key.StartsWith("khong") || key.StartsWith("chua"))
        {
            value = WorkPermitValues.No;
            return true;
        }

        if (key is "c" or "x" or "yes" or "y" or "v" || key.StartsWith("co") || key.StartsWith("da co"))
        {
            value = WorkPermitValues.Yes;
            return true;
        }

        return false;
    }

    /// <summary>TT đánh lại trong từng nhóm đầu mục, theo thứ tự đầu mục rồi thứ tự dòng.</summary>
    public static IReadOnlyList<(TItem Item, int Tt)> OrderForGrid<TItem, TWorker>(
        IEnumerable<TItem> items, IReadOnlyDictionary<int, WorkCategory> categories)
        where TItem : WorkItemBase<TWorker>
        where TWorker : WorkItemWorkerBase
    {
        var tt = new Dictionary<int, int>();
        return items
            .OrderBy(x => categories.GetValueOrDefault(x.WorkCategoryId)?.SortOrder ?? int.MaxValue)
            .ThenBy(x => x.WorkCategoryId)
            .ThenBy(x => x.SortOrder).ThenBy(x => x.Id)
            .Select(x =>
            {
                tt[x.WorkCategoryId] = tt.GetValueOrDefault(x.WorkCategoryId) + 1;
                return (x, tt[x.WorkCategoryId]);
            })
            .ToList();
    }
}
