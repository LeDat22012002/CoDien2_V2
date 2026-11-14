using Server.Data;
using Server.Modules.WorkReports.DTOs;
using Server.Modules.WorkReports.Entities;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services.Interfaces;
using Server.Modules.WorkReports.Validators;

namespace Server.Modules.WorkReports.Services;

public class WorkReportSettingService(
    IWorkReportSettingRepository settingRepository,
    IWorkWeekService workWeekService,
    IUnitOfWork unitOfWork) : IWorkReportSettingService
{
    public async Task<WorkReportSettingDto> GetAsync(CancellationToken cancellationToken) =>
        ToDto(await settingRepository.GetAsync(cancellationToken));

    public async Task<WorkReportSettingDto> UpdateAsync(
        UpdateWorkReportSettingRequest request, CancellationToken cancellationToken)
    {
        WorkReportSettingRequestValidator.Validate(request);

        var setting = await settingRepository.FindAsync(cancellationToken);
        if (setting is null)
        {
            setting = new WorkReportSetting();
            settingRepository.Add(setting);
        }

        setting.HcMinutesPerWeek = Math.Round(request.HcMinutesPerWeek, 2);
        setting.ShiftMinutesPerWeek = Math.Round(request.ShiftMinutesPerWeek, 2);
        setting.DeadlineDayOffset = request.DeadlineDayOffset;
        setting.DeadlineTime = new TimeOnly(request.DeadlineTime.Hour, request.DeadlineTime.Minute);
        setting.WarnDaysBefore = request.WarnDaysBefore;

        // Cùng 1 lần SaveChanges với cấu hình mới
        await workWeekService.RecalculateDefaultDeadlinesAsync(setting, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(setting);
    }

    private static WorkReportSettingDto ToDto(WorkReportSetting setting) => new()
    {
        HcMinutesPerWeek = setting.HcMinutesPerWeek,
        ShiftMinutesPerWeek = setting.ShiftMinutesPerWeek,
        DeadlineDayOffset = setting.DeadlineDayOffset,
        DeadlineTime = setting.DeadlineTime,
        WarnDaysBefore = setting.WarnDaysBefore,
        DeadlineDescription = WorkWeekCalculator.DescribeDeadline(setting),
    };
}