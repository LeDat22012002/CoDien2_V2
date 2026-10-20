using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Server.Modules.Documents.Entities;

namespace Server.Data.Configurations;

public class IssuedDocumentConfiguration : IEntityTypeConfiguration<IssuedDocument>
{
    public void Configure(EntityTypeBuilder<IssuedDocument> builder)
    {
        builder.ToTable("IssuedDocument", "dbo");

        builder.HasKey(x => x.Id);

        // Đuôi số biểu mẫu tối đa 100 ký tự + phần STT/năm/hợp đồng → 255 để không bị cắt
        builder.Property(x => x.DocumentNumber).HasMaxLength(255).IsRequired();
        builder.Property(x => x.IssuedAt).HasColumnType("datetime2");
        builder.Property(x => x.IssuerName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.IssuerEmpCode).HasMaxLength(50).IsRequired();
        builder.Property(x => x.IssuerUnit).HasMaxLength(255).IsRequired();
        builder.Property(x => x.Subject).HasMaxLength(1000);
        builder.Property(x => x.ContractNumber).HasMaxLength(100);
        builder.Property(x => x.IssueDate).HasColumnType("date");
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.PublishStatus).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(x => x.EOfficeLink).HasMaxLength(1000);

        // Không đặt unique: dữ liệu cũ có số hiệu trùng; chống trùng số mới bằng khóa dòng khi cấp số
        builder.HasIndex(x => new { x.DocumentTemplateId, x.Year, x.SequenceNumber });
        builder.HasIndex(x => x.DocumentNumber);
        builder.HasIndex(x => x.ContractNumber);

        // Tự khai báo filter (AppDbContext không ghi đè): ẩn văn bản đã xóa mềm và văn bản của biểu mẫu đã xóa mềm
        builder.HasQueryFilter(x => !x.IsDeleted && !x.DocumentTemplate.IsDeleted);

        builder.HasOne(x => x.DocumentTemplate)
            .WithMany()
            .HasForeignKey(x => x.DocumentTemplateId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
