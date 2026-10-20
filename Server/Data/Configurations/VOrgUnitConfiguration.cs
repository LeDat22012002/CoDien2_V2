using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Organization.Entities;

namespace Server.Data.Configurations;

public class VOrgUnitConfiguration : IEntityTypeConfiguration<VOrgUnit>
{
    public void Configure(EntityTypeBuilder<VOrgUnit> builder)
    {
        // View có sẵn trong DB, chỉ đọc
        builder.ToView("vOrgUnit", "dbo");
        builder.HasNoKey();
    }
}
