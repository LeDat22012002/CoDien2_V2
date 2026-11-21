using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Shared.Exceptions;

namespace Server.Modules.WorkReports.Services;

/// <summary>
/// Xuất Excel theo xưởng: lấy dữ liệu qua đúng các service của lưới, Tổng hợp, Vật tư xưởng (đã lọc theo phạm vi
/// người gọi: chỉ tổ/kíp xem được) nên file khớp với màn hình; dựng file bằng <see cref="WorkReportExcelBuilder"/>.
/// </summary>
public class WorkReportExportService(
    IWorkPlanService planService,
    IWorkReportService reportService,
    IWorkPlanMaterialService planMaterialService,
    IWorkReportMaterialService reportMaterialService) : IWorkReportExportService
{
    public async Task<WorkReportExportFile> ExportAsync(
        WorkReportExportRequest request, CancellationToken cancellationToken)
    {
        var phase = request.Phase?.Trim().ToUpperInvariant();
        if (phase is not (WorkReportPhases.Plan or WorkReportPhases.Report) || request.WorkshopId <= 0 || request.WeekId <= 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", new Dictionary<string, string[]>
            {
                ["phase"] = ["Chọn xưởng, tuần và giai đoạn (PLAN | REPORT)."],
            });
        }

        var gridRequest = new WorkReportGridRequest { WorkshopId = request.WorkshopId, WeekId = request.WeekId };
        var materialFilter = new WorkshopMaterialFilterRequest { WorkshopId = request.WorkshopId, WeekId = request.WeekId };

        WorkReportExportData data;
        if (phase == WorkReportPhases.Plan)
        {
            var grid = await planService.GetGridAsync(gridRequest, cancellationToken);
            data = new WorkReportExportData(
                phase,
                grid.WorkshopName,
                grid.Week,
                grid.Categories,
                grid.Forms.Select(x => new WorkReportExportForm(x, x.Items)).ToList(),
                await planService.GetSummaryAsync(gridRequest, cancellationToken),
                await planMaterialService.GetWorkshopMaterialsAsync(materialFilter, cancellationToken));
        }
        else
        {
            var grid = await reportService.GetGridAsync(gridRequest, cancellationToken);
            data = new WorkReportExportData(
                phase,
                grid.WorkshopName,
                grid.Week,
                grid.Categories,
                grid.Forms.Select(x => new WorkReportExportForm(x, x.Items)).ToList(),
                await reportService.GetSummaryAsync(gridRequest, cancellationToken),
                await reportMaterialService.GetWorkshopMaterialsAsync(materialFilter, cancellationToken));
        }

        if (data.Forms.Count == 0)
        {
            throw new BusinessException("Không có tổ/kíp nào của xưởng trong tuần này để xuất.");
        }

        return new WorkReportExportFile(
            WorkReportExcelBuilder.BuildFileName(phase, data.WorkshopName, data.Week),
            WorkReportExcelBuilder.Build(data));
    }
}