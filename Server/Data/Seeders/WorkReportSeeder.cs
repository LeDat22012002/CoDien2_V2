using Microsoft.EntityFrameworkCore;
using Server.Modules.WorkReports.Entities;

namespace Server.Data.Seeders;

/// <summary>
/// Dữ liệu mặc định của báo cáo công việc tuần, chạy mỗi lần khởi động, an toàn khi chạy lặp lại:
/// - Đầu mục công việc A→I và mục đích vật tư: chỉ tạo khi bảng chưa có dòng nào (sau đó admin quản lý trên web).
/// - Cấu hình chung: tạo 1 dòng nếu chưa có.
/// </summary>
public class WorkReportSeeder(AppDbContext dbContext, ILogger<WorkReportSeeder> logger)
{
    /// <summary>(Nhóm, Tên, Giá trị dropdown, Hậu tố mã) theo đúng file Excel mẫu.</summary>
    private static readonly (string Letter, string Name, string Code, string Suffix)[] DefaultCategories =
    [
        ("A", "Bảo trì level 1", "BT-LV1", "LV1"),
        ("B", "Bảo trì level 2", "BT-LV2", "LV2"),
        ("C", "Bảo trì level 3", "BT-LV3", "LV3"),
        ("D", "Bảo trì level 4", "BT-LV4", "LV4"),
        ("E", "Bảo trì phản ứng", "BT Phản ứng", "PU"),
        ("F", "Phục hồi nội bộ", "PHNB", "PHNB"),
        ("G", "CTCT", "CTCT", "CTCT"),
        ("H", "5S", "5S", "5S"),
        ("I", "Công việc khác", "Khác", "KHAC"),
    ];

    private static readonly string[] DefaultMaterialPurposes =
        ["BTBD", "BTSC", "TTTX", "THTX", "Phục hồi", "VTDP", "Gói Thầu", "CTCT"];

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        // Seed bỏ qua query filter để không tạo lại khi admin đã xóa mềm/ngừng dùng hết
        if (!await dbContext.Set<WorkCategory>().IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            var sortOrder = 0;
            foreach (var (letter, name, code, suffix) in DefaultCategories)
            {
                dbContext.Add(new WorkCategory
                {
                    GroupLetter = letter,
                    Name = name,
                    Code = code,
                    CodeSuffix = suffix,
                    SortOrder = sortOrder += 10,
                    ShowInSummary = true,
                    IsActive = true,
                });
            }

            logger.LogInformation("Đã tạo {Count} đầu mục công việc mặc định", DefaultCategories.Length);
        }

        if (!await dbContext.Set<MaterialPurpose>().IgnoreQueryFilters().AnyAsync(cancellationToken))
        {
            var sortOrder = 0;
            foreach (var code in DefaultMaterialPurposes)
            {
                dbContext.Add(new MaterialPurpose
                {
                    Code = code,
                    SortOrder = sortOrder += 10,
                    IsActive = true,
                });
            }

            logger.LogInformation("Đã tạo {Count} mục đích vật tư mặc định", DefaultMaterialPurposes.Length);
        }

        if (!await dbContext.Set<WorkReportSetting>().AnyAsync(cancellationToken))
        {
            dbContext.Add(new WorkReportSetting());
            logger.LogInformation("Đã tạo cấu hình báo cáo công việc tuần mặc định");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}