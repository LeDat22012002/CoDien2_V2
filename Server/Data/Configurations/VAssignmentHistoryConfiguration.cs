using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class VAssignmentHistoryConfiguration : IEntityTypeConfiguration<VAssignmentHistory>
{
    public void Configure(EntityTypeBuilder<VAssignmentHistory> builder)
    {
        // View có sẵn trong DB, chỉ đọc
        builder.ToView("vAssignmentHistory", "dbo");
        builder.HasNoKey();
    }
}
