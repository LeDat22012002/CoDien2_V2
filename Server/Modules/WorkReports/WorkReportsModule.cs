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
        services.AddScoped<IWorkItemRepository, WorkItemRepository>();
        services.AddScoped<IWorkMaterialRepository, WorkMaterialRepository>();

        // Scoped: cây đơn vị và phạm vi người gọi chỉ tính 1 lần mỗi request
        services.AddScoped<IOrgTreeProvider, OrgTreeProvider>();
        services.AddScoped<IWorkReportScopeService, WorkReportScopeService>();

        services.AddScoped<IWorkCategoryService, WorkCategoryService>();
        services.AddScoped<IMaterialPurposeService, MaterialPurposeService>();
        services.AddScoped<IWorkWeekService, WorkWeekService>();
        services.AddScoped<IWeeklyFormService, WeeklyFormService>();
        services.AddScoped<IWorkItemService, WorkItemService>();
        services.AddScoped<IWorkMaterialService, WorkMaterialService>();
        services.AddScoped<IWorkReportSettingService, WorkReportSettingService>();
        services.AddScoped<IWorkReportUnitEngineerService, WorkReportUnitEngineerService>();
        services.AddScoped<IWorkReportUnitSyncService, WorkReportUnitSyncService>();
        services.AddScoped<IWorkReportUnitService, WorkReportUnitService>();

        services.AddHostedService<WorkWeekGeneratorService>();

        return services;
    }
}