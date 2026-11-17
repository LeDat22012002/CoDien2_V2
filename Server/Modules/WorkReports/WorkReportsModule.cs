using Server.Modules.WorkReports.Repositories;
using Server.Modules.WorkReports.Repositories.Interfaces;
using Server.Modules.WorkReports.Services;
using Server.Modules.WorkReports.Services.Interfaces;

namespace Server.Modules.WorkReports;

/// <summary>Kế hoạch & báo cáo công việc tuần. Tài liệu nghiệp vụ: Docs/HUONG_DAN_BAO_CAO_TUAN.md.</summary>
public static class WorkReportsModule
{
    public static IServiceCollection AddWorkReportsModule(this IServiceCollection services)
    {
        services.AddScoped<IWorkCategoryRepository, WorkCategoryRepository>();
        services.AddScoped<IMaterialPurposeRepository, MaterialPurposeRepository>();
        services.AddScoped<IWorkReportSettingRepository, WorkReportSettingRepository>();
        services.AddScoped<IWorkReportUnitRepository, WorkReportUnitRepository>();
        services.AddScoped<IWorkWeekRepository, WorkWeekRepository>();
        services.AddScoped<IWeeklyFormRepository, WeeklyFormRepository>();
        services.AddScoped<IWorkPlanItemRepository, WorkPlanItemRepository>();
        services.AddScoped<IWorkReportItemRepository, WorkReportItemRepository>();
        services.AddScoped<IWorkPlanMaterialRepository, WorkPlanMaterialRepository>();
        services.AddScoped<IWorkReportMaterialRepository, WorkReportMaterialRepository>();

        // Scoped: cây đơn vị và phạm vi người gọi chỉ tính 1 lần mỗi request
        services.AddScoped<IOrgTreeProvider, OrgTreeProvider>();
        services.AddScoped<IWorkReportScopeService, WorkReportScopeService>();

        services.AddScoped<IWorkCategoryService, WorkCategoryService>();
        services.AddScoped<IMaterialPurposeService, MaterialPurposeService>();
        services.AddScoped<IWorkWeekService, WorkWeekService>();
        services.AddScoped<IWeeklyFormService, WeeklyFormService>();
        // Cập nhật tức thì (SignalR): hub map ở Program.cs (WorkReportHub.Path)
        services.AddSignalR();
        services.AddScoped<IWorkReportNotifier, WorkReportNotifier>();
        // Ai đang sửa dòng nào (khóa mềm, trong bộ nhớ) + dọn mục quá hạn
        services.AddSingleton<Hubs.WorkReportPresenceTracker>();
        services.AddHostedService<Hubs.WorkReportPresenceCleanupService>();

        services.AddScoped<WorkItemSupport>();
        services.AddScoped<IWorkerOptionService, WorkerOptionService>();
        services.AddScoped<IWorkPlanService, WorkPlanService>();
        services.AddScoped<IWorkReportService, WorkReportService>();
        services.AddScoped<IWorkPlanMaterialService, WorkPlanMaterialService>();
        services.AddScoped<IWorkReportMaterialService, WorkReportMaterialService>();
        services.AddScoped<IWorkReportSettingService, WorkReportSettingService>();
        services.AddScoped<IWorkReportUnitEngineerService, WorkReportUnitEngineerService>();
        services.AddScoped<IWorkReportUnitSyncService, WorkReportUnitSyncService>();
        services.AddScoped<IWorkReportUnitService, WorkReportUnitService>();

        services.AddHostedService<WorkWeekGeneratorService>();

        return services;
    }
}