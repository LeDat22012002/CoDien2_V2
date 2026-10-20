using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Modules.Documents.Repositories.Interfaces;
using Server.Modules.Employees.Entities;

namespace Server.Modules.Documents.Repositories;

public class IssuedDocumentRepository(AppDbContext dbContext) : IIssuedDocumentRepository
{
    private DbSet<IssuedDocument> Documents => dbContext.Set<IssuedDocument>();

    /// <summary>Đọc bảng có khóa dòng tới hết transaction; query filter (xóa mềm) vẫn áp dụng bên ngoài.</summary>
    private IQueryable<IssuedDocument> LockedDocuments =>
        Documents.FromSql($"SELECT * FROM dbo.IssuedDocument WITH (UPDLOCK, HOLDLOCK)");

    public async Task<(IReadOnlyList<IssuedDocumentDto> Items, int TotalCount)> GetPagedAsync(
        IssuedDocumentFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Documents.AsNoTracking();

        if (filter.DocumentTemplateId is { } templateId)
        {
            query = query.Where(x => x.DocumentTemplateId == templateId);
        }

        if (!string.IsNullOrWhiteSpace(filter.IssuerEmpCode))
        {
            var empCode = filter.IssuerEmpCode.Trim();
            query = query.Where(x => x.IssuerEmpCode.Contains(empCode));
        }

        if (!string.IsNullOrWhiteSpace(filter.Note))
        {
            var note = filter.Note.Trim();
            query = query.Where(x => x.Note != null && x.Note.Contains(note));
        }

        if (filter.FromDate is { } fromDate)
        {
            query = query.Where(x => x.IssueDate >= fromDate);
        }

        if (filter.ToDate is { } toDate)
        {
            query = query.Where(x => x.IssueDate <= toDate);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(x => x.Id)
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new IssuedDocumentDto
            {
                Id = x.Id,
                DocumentTemplateId = x.DocumentTemplateId,
                SequenceNumber = x.SequenceNumber,
                Year = x.Year,
                DocumentNumber = x.DocumentNumber,
                IssuedAt = x.IssuedAt,
                IssuerName = x.IssuerName,
                IssuerEmpCode = x.IssuerEmpCode,
                IssuerUnit = x.IssuerUnit,
                Subject = x.Subject,
                ContractNumber = x.ContractNumber,
                IssueDate = x.IssueDate,
                Note = x.Note,
                PublishStatus = x.PublishStatus,
                EOfficeLink = x.EOfficeLink,
                TemplateCode = x.DocumentTemplate.Code,
                TemplateName = x.DocumentTemplate.Name,
                NumberSuffix = x.DocumentTemplate.NumberSuffix,
            })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<IssuedDocument?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Documents.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<int?> GetMaxSequenceWithLockAsync(int templateId, int year, CancellationToken cancellationToken) =>
        LockedDocuments
            .Where(x => x.DocumentTemplateId == templateId && x.Year == year)
            .MaxAsync(x => (int?)x.SequenceNumber, cancellationToken);

    public async Task<IReadOnlyList<string>> GetNumbersEndingWithLockAsync(
        string ending, CancellationToken cancellationToken) =>
        await LockedDocuments
            .Where(x => x.DocumentNumber.EndsWith(ending))
            .Select(x => x.DocumentNumber)
            .ToListAsync(cancellationToken);

    public Task<IssuedDocument?> GetLatestByContractWithLockAsync(
        int templateId, string contractNumber, CancellationToken cancellationToken) =>
        LockedDocuments
            .AsNoTracking()
            .Where(x => x.DocumentTemplateId == templateId && x.ContractNumber == contractNumber)
            .OrderByDescending(x => x.SequenceNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<int?> GetMaxSequenceAsync(int templateId, int year, CancellationToken cancellationToken) =>
        Documents
            .Where(x => x.DocumentTemplateId == templateId && x.Year == year)
            .MaxAsync(x => (int?)x.SequenceNumber, cancellationToken);

    public async Task<IReadOnlyList<string>> GetContractNumbersAsync(int templateId, CancellationToken cancellationToken) =>
        await Documents
            .Where(x => x.DocumentTemplateId == templateId && x.ContractNumber != null)
            .Select(x => x.ContractNumber!)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<IssuedDocument>> GetForExportAsync(int? year, CancellationToken cancellationToken)
    {
        var query = Documents.AsNoTracking().Include(x => x.DocumentTemplate).AsQueryable();
        if (year is { } value)
        {
            query = query.Where(x => x.Year == value);
        }

        return await query
            .OrderBy(x => x.DocumentTemplate.Name)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Employee?> GetEmployeeByEmpCodeAsync(string empCode, CancellationToken cancellationToken) =>
        dbContext.Set<Employee>().AsNoTracking().FirstOrDefaultAsync(x => x.EmpCode == empCode, cancellationToken);

    public void Add(IssuedDocument document) => Documents.Add(document);

    public void Remove(IssuedDocument document) => Documents.Remove(document);
}
