using ClosedXML.Excel;
using Server.Data;
using Server.Modules.Equipments.Services.Interfaces;
using Server.Modules.Incidents.DTOs;
using Server.Modules.Incidents.Entities;
using Server.Modules.Incidents.Repositories.Interfaces;
using Server.Modules.Incidents.Services.Interfaces;
using Server.Modules.Incidents.Validators;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Exceptions;
using Server.Shared.Helpers;
using Server.Shared.Models;
using Server.Shared.Services;

namespace Server.Modules.Incidents.Services;

/// <summary>
/// Báo cáo sự cố (chuyển từ BaoCaoSuCoService cũ). Phân quyền:
/// - Tạo: mọi người đăng nhập; người nhập sửa được tiến độ và bổ sung số order/link của báo cáo mình nhập.
/// - incidents.analyze: phân tích + bổ sung báo cáo thuộc xưởng (đơn vị cấp 1) của mình.
/// - incidents.manage: sửa đầy đủ, phân tích/bổ sung mọi xưởng, xóa, import.
/// </summary>
public class IncidentService(
    IIncidentRepository incidentRepository,
    IEquipmentService equipmentService,
    IOrgUnitService orgUnitService,
    IAssignmentService assignmentService,
    IPermissionChecker permissionChecker,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork) : IIncidentService
{
    private const string NotFoundMessage = "Không tìm thấy báo cáo sự cố.";
    private const string InvalidSessionMessage = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.";

    /// <summary>Gặp nhiều dòng trống liên tiếp thì coi như hết dữ liệu của sheet.</summary>
    private const int MaxEmptyRows = 20;

    // ===== Tra cứu =====

    public async Task<PagedResult<IncidentDto>> GetPagedAsync(
        IncidentFilterRequest filter, CancellationToken cancellationToken)
    {
        var reporterEmpCode = filter.OnlyMine
            ? currentUserService.UserName ?? throw new UnauthorizedException("Vui lòng đăng nhập để xem báo cáo của mình.")
            : null;

        var (items, totalCount) = await incidentRepository.GetPagedAsync(filter, reporterEmpCode, cancellationToken);

        return new PagedResult<IncidentDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<IncidentDto> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        await incidentRepository.GetDetailAsync(id, cancellationToken) ?? throw new NotFoundException(NotFoundMessage);

    // ===== Ghi =====

    public async Task<IncidentDto> CreateAsync(CreateIncidentRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        IncidentRequestValidator.Validate(request);
        await ValidateReferencesAsync(request, null, cancellationToken);

        var empCode = currentUserService.UserName ?? throw new UnauthorizedException(InvalidSessionMessage);
        var employee = await incidentRepository.GetEmployeeByEmpCodeAsync(empCode, cancellationToken)
            ?? throw new UnauthorizedException(InvalidSessionMessage);

        var incident = new Incident
        {
            ReportedAt = DateTime.Now,
            ReporterEmpCode = employee.EmpCode,
            ReporterName = employee.FullName,
        };
        Apply(incident, request);

        incidentRepository.Add(incident);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(incident.Id, cancellationToken);
    }

    public async Task<IncidentDto> UpdateAsync(int id, UpdateIncidentRequest request, CancellationToken cancellationToken)
    {
        Normalize(request);
        IncidentRequestValidator.Validate(request);

        var incident = await FindAsync(id, cancellationToken);
        await ValidateReferencesAsync(request, incident, cancellationToken);

        Apply(incident, request);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<IncidentDto> UpdateProgressAsync(
        int id, UpdateIncidentProgressRequest request, CancellationToken cancellationToken)
    {
        request.Description = NullIfEmpty(request.Description);
        request.Solution = NullIfEmpty(request.Solution);
        IncidentRequestValidator.Validate(request);

        var incident = await FindAsync(id, cancellationToken);
        if (!IsReporter(incident) && !await HasPermissionAsync(PermissionCodes.Incidents.Manage, cancellationToken))
        {
            throw new ForbiddenException("Bạn chỉ được cập nhật báo cáo do chính mình nhập.");
        }

        incident.ReceivedAt = request.ReceivedAt;
        incident.RepairStartedAt = request.RepairStartedAt;
        incident.RepairFinishedAt = request.RepairFinishedAt;
        incident.HandedOverAt = request.HandedOverAt;
        incident.Description = request.Description;
        incident.Solution = request.Solution;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<IncidentDto> UpdateAnalysisAsync(
        int id, UpdateIncidentAnalysisRequest request, CancellationToken cancellationToken)
    {
        request.Cause = NullIfEmpty(request.Cause);
        request.RootCause = NullIfEmpty(request.RootCause);
        request.CorrectiveAction = NullIfEmpty(request.CorrectiveAction);
        IncidentRequestValidator.Validate(request);

        var incident = await FindAsync(id, cancellationToken);
        if (!await CanAnalyzeAsync(incident, cancellationToken))
        {
            throw new ForbiddenException("Bạn chỉ được phân tích báo cáo sự cố thuộc xưởng của mình.");
        }

        incident.Cause = request.Cause;
        incident.RootCause = request.RootCause;
        incident.CorrectiveAction = request.CorrectiveAction;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<IncidentDto> UpdateSupplementAsync(
        int id, UpdateIncidentSupplementRequest request, CancellationToken cancellationToken)
    {
        request.OrderNumber = NullIfEmpty(request.OrderNumber);
        request.ReportLink = NullIfEmpty(request.ReportLink);
        IncidentRequestValidator.Validate(request);

        var incident = await FindAsync(id, cancellationToken);
        if (!IsReporter(incident) && !await CanAnalyzeAsync(incident, cancellationToken))
        {
            throw new ForbiddenException("Bạn chỉ được bổ sung báo cáo do mình nhập hoặc thuộc xưởng của mình.");
        }

        incident.OrderNumber = request.OrderNumber;
        incident.ReportLink = request.ReportLink;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var incident = await FindAsync(id, cancellationToken);
        incidentRepository.Remove(incident);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    // ===== Import Excel =====

    /// <summary>
    /// Mỗi sheet gán cho 1 xưởng. Dữ liệu import không có người nhập và thời điểm nhập (như hệ thống cũ)
    /// nên không tính vào dashboard; mã thiết bị không bắt buộc có trong danh mục.
    /// </summary>
    public async Task<IncidentImportResultDto> ImportExcelAsync(
        IFormFile file, IReadOnlyList<IncidentImportSheetConfig> configs, CancellationToken cancellationToken)
    {
        if (configs.Count == 0)
        {
            throw new BusinessException("Chưa có cấu hình sheet.");
        }

        using var workbook = await ExcelCellReader.OpenWorkbookAsync(file, cancellationToken);
        var workshopIds = (await orgUnitService.GetTopLevelUnitsAsync(includeInactive: false, cancellationToken))
            .Select(x => x.Id)
            .ToHashSet();

        var result = new IncidentImportResultDto();
        var incidents = new List<Incident>();

        foreach (var config in configs)
        {
            var sheet = ExcelCellReader.FindSheet(workbook, config.SheetName);
            if (sheet is null)
            {
                result.Errors.Add($"Không tìm thấy sheet '{config.SheetName}'");
                continue;
            }

            if (!workshopIds.Contains(config.WorkshopId))
            {
                result.Errors.Add($"[{sheet.Name}] Chưa chọn xưởng hoặc xưởng không hợp lệ");
                continue;
            }

            if (config.EquipmentCodeColumn <= 0)
            {
                result.Errors.Add($"[{sheet.Name}] Chưa khai báo cột Mã thiết bị");
                continue;
            }

            ReadSheet(sheet, config, incidents, result);
        }

        if (incidents.Count > 0)
        {
            incidentRepository.AddRange(incidents);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        result.InsertedCount = incidents.Count;
        return result;
    }

    private static void ReadSheet(
        IXLWorksheet sheet, IncidentImportSheetConfig config, List<Incident> output, IncidentImportResultDto result)
    {
        var lastUsedRow = ExcelCellReader.GetLastUsedRow(sheet);
        var endRow = config.EndRow > 0 ? Math.Min(config.EndRow, lastUsedRow) : lastUsedRow;
        var emptyStreak = 0;

        for (var row = Math.Max(config.StartRow, 1); row <= endRow; row++)
        {
            var equipmentCode = ExcelCellReader.GetText(sheet, row, config.EquipmentCodeColumn);
            var equipmentName = ExcelCellReader.GetText(sheet, row, config.EquipmentNameColumn);
            var shift = ExcelCellReader.GetText(sheet, row, config.ShiftColumn);

            // Trống cả 3 cột định danh thì bỏ qua dòng
            if (equipmentCode is null && equipmentName is null && shift is null)
            {
                if (++emptyStreak >= MaxEmptyRows)
                {
                    break;
                }

                continue;
            }

            emptyStreak = 0;
            result.TotalRows++;

            if (equipmentCode is null)
            {
                result.Errors.Add($"[{sheet.Name}] Dòng {row}: thiếu Mã thiết bị");
                continue;
            }

            output.Add(new Incident
            {
                WorkshopId = config.WorkshopId,
                Shift = ExcelCellReader.Truncate(shift, 20) ?? string.Empty,
                EquipmentCode = ExcelCellReader.Truncate(equipmentCode, 50)!,
                EquipmentName = ExcelCellReader.Truncate(equipmentName, 255) ?? string.Empty,
                DeviceName = ReadText(sheet, row, config.DeviceNameColumn, 255),
                ReceivedAt = ExcelCellReader.GetDateTime(sheet, row, config.ReceivedAtColumn, config.DefaultYear),
                RepairStartedAt = ExcelCellReader.GetDateTime(
                    sheet, row, config.RepairStartedAtColumn, config.DefaultYear),
                RepairFinishedAt = ExcelCellReader.GetDateTime(
                    sheet, row, config.RepairFinishedAtColumn, config.DefaultYear),
                HandedOverAt = ExcelCellReader.GetDateTime(sheet, row, config.HandedOverAtColumn, config.DefaultYear),
                IncidentType = ReadText(sheet, row, config.IncidentTypeColumn, 100) ?? string.Empty,
                StopLevel = ReadText(sheet, row, config.StopLevelColumn, 100) ?? string.Empty,
                AffectsProduction = ExcelCellReader.GetBoolean(sheet, row, config.AffectsProductionColumn),
                Description = ReadLongText(sheet, row, config.DescriptionColumn),
                Solution = ReadLongText(sheet, row, config.SolutionColumn),
                Cause = ReadLongText(sheet, row, config.CauseColumn),
                RootCause = ReadLongText(sheet, row, config.RootCauseColumn),
                CorrectiveAction = ReadLongText(sheet, row, config.CorrectiveActionColumn),
                Result = ExcelCellReader.GetNumber(sheet, row, config.ResultColumn),
                Note = ReadLongText(sheet, row, config.NoteColumn),
            });
        }
    }

    // ===== Nội bộ =====

    private async Task<Incident> FindAsync(int id, CancellationToken cancellationToken) =>
        await incidentRepository.FindByIdAsync(id, cancellationToken) ?? throw new NotFoundException(NotFoundMessage);

    /// <summary>
    /// Xưởng phải là đơn vị cấp 1 đang hoạt động; thiết bị phải có trong danh mục.
    /// Khi sửa, giá trị không đổi thì không kiểm tra lại (dữ liệu cũ / import có thể không khớp danh mục).
    /// </summary>
    private async Task ValidateReferencesAsync(
        IncidentRequestBase request, Incident? current, CancellationToken cancellationToken)
    {
        var errors = new Dictionary<string, string[]>();

        if (request.WorkshopId is { } workshopId && workshopId != current?.WorkshopId)
        {
            var workshops = await orgUnitService.GetTopLevelUnitsAsync(includeInactive: false, cancellationToken);
            if (workshops.All(x => x.Id != workshopId))
            {
                errors["workshopId"] = ["Xưởng không hợp lệ."];
            }
        }

        if (!string.Equals(request.EquipmentCode, current?.EquipmentCode, StringComparison.OrdinalIgnoreCase)
            && await equipmentService.GetByCodeAsync(request.EquipmentCode, cancellationToken) is null)
        {
            errors["equipmentCode"] = [$"Mã thiết bị '{request.EquipmentCode}' không có trong danh mục thiết bị."];
        }

        if (errors.Count > 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", errors);
        }
    }

    private bool IsReporter(Incident incident) =>
        incident.ReporterEmpCode is not null
        && string.Equals(incident.ReporterEmpCode, currentUserService.UserName, StringComparison.OrdinalIgnoreCase);

    /// <summary>Quản lý: mọi báo cáo; phân tích: báo cáo thuộc xưởng (đơn vị cấp 1) của mình.</summary>
    private async Task<bool> CanAnalyzeAsync(Incident incident, CancellationToken cancellationToken)
    {
        if (await HasPermissionAsync(PermissionCodes.Incidents.Manage, cancellationToken))
        {
            return true;
        }

        if (incident.WorkshopId is null
            || !await HasPermissionAsync(PermissionCodes.Incidents.Analyze, cancellationToken))
        {
            return false;
        }

        var empCode = currentUserService.UserName ?? throw new UnauthorizedException(InvalidSessionMessage);
        var employee = await incidentRepository.GetEmployeeByEmpCodeAsync(empCode, cancellationToken);
        if (employee is null)
        {
            return false;
        }

        var workshop = await assignmentService.GetTopLevelUnitAsync(employee.Id, cancellationToken);
        return workshop?.Id == incident.WorkshopId;
    }

    private async Task<bool> HasPermissionAsync(string permissionCode, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId ?? throw new UnauthorizedException(InvalidSessionMessage);
        return await permissionChecker.HasPermissionAsync(userId, permissionCode, cancellationToken);
    }

    private static void Normalize(IncidentRequestBase request)
    {
        request.Shift = request.Shift?.Trim() ?? string.Empty;
        request.EquipmentCode = request.EquipmentCode?.Trim() ?? string.Empty;
        request.EquipmentName = request.EquipmentName?.Trim() ?? string.Empty;
        request.DeviceName = NullIfEmpty(request.DeviceName);
        request.IncidentType = request.IncidentType?.Trim() ?? string.Empty;
        request.StopLevel = request.StopLevel?.Trim() ?? string.Empty;
        request.Description = NullIfEmpty(request.Description);
        request.Solution = NullIfEmpty(request.Solution);
        request.Note = NullIfEmpty(request.Note);
        request.OrderNumber = NullIfEmpty(request.OrderNumber);
        request.ReportLink = NullIfEmpty(request.ReportLink);
    }

    /// <summary>Gán toàn bộ trường người nhập điền; không đụng phần phân tích, người nhập, thời điểm nhập.</summary>
    private static void Apply(Incident incident, IncidentRequestBase request)
    {
        incident.WorkshopId = request.WorkshopId;
        incident.Shift = request.Shift;
        incident.EquipmentCode = request.EquipmentCode;
        incident.EquipmentName = request.EquipmentName;
        incident.DeviceName = request.DeviceName;
        incident.ReceivedAt = request.ReceivedAt;
        incident.RepairStartedAt = request.RepairStartedAt;
        incident.RepairFinishedAt = request.RepairFinishedAt;
        incident.HandedOverAt = request.HandedOverAt;
        incident.IncidentType = request.IncidentType;
        incident.StopLevel = request.StopLevel;
        incident.AffectsProduction = request.AffectsProduction;
        incident.Description = request.Description;
        incident.Solution = request.Solution;
        incident.Result = request.Result;
        incident.Note = request.Note;
        incident.OrderNumber = request.OrderNumber;
        incident.ReportLink = request.ReportLink;
    }

    private static string? ReadText(IXLWorksheet sheet, int row, int column, int maxLength) =>
        ExcelCellReader.Truncate(ExcelCellReader.GetText(sheet, row, column), maxLength);

    private static string? ReadLongText(IXLWorksheet sheet, int row, int column) =>
        ReadText(sheet, row, column, IncidentRequestValidator.LongTextMaxLength);

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
