using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Modules.Documents.Repositories.Interfaces;

namespace Server.Modules.Documents.Repositories;

public class DocumentTemplateRepository(AppDbContext dbContext) : IDocumentTemplateRepository
{
    private DbSet<DocumentTemplate> Templates => dbContext.Set<DocumentTemplate>();

    public async Task<IReadOnlyList<DocumentTemplate>> GetAllAsync(CancellationToken cancellationToken) =>
        await Templates.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<DocumentTemplate> Items, int TotalCount)> GetPagedAsync(
        DocumentTemplateFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Templates.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x => x.Name.Contains(keyword) || x.Code.Contains(keyword));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await (filter.SortDescending ? query.OrderByDescending(x => x.Name) : query.OrderBy(x => x.Name))
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<DocumentTemplate?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Templates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<DocumentTemplate?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Templates.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsNameTakenAsync(string name, int? excludeId, CancellationToken cancellationToken) =>
        Templates.AnyAsync(x => x.Name == name && (excludeId == null || x.Id != excludeId), cancellationToken);

    public Task<bool> IsUsedAsync(int id, CancellationToken cancellationToken) =>
        dbContext.Set<IssuedDocument>().AnyAsync(x => x.DocumentTemplateId == id, cancellationToken);

    public void Add(DocumentTemplate template) => Templates.Add(template);

    public void Remove(DocumentTemplate template) => Templates.Remove(template);
}
