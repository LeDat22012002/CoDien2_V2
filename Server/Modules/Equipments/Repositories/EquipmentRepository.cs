using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Equipments.DTOs;
using Server.Modules.Equipments.Entities;
using Server.Modules.Equipments.Repositories.Interfaces;

namespace Server.Modules.Equipments.Repositories;

public class EquipmentRepository(AppDbContext dbContext) : IEquipmentRepository
{
    private DbSet<Equipment> Equipments => dbContext.Set<Equipment>();

    public async Task<(IReadOnlyList<EquipmentDto> Items, int TotalCount)> GetPagedAsync(
        EquipmentFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Equipments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Code))
        {
            var code = filter.Code.Trim();
            query = query.Where(x => x.Code == code);
        }

        query = ApplyKeyword(query, filter.Keyword);

        var totalCount = await query.CountAsync(cancellationToken);

        var isDescending = !string.Equals(filter.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        query = filter.SortBy?.ToLowerInvariant() switch
        {
            "code" => isDescending ? query.OrderByDescending(x => x.Code) : query.OrderBy(x => x.Code),
            "name" => isDescending ? query.OrderByDescending(x => x.Name) : query.OrderBy(x => x.Name),
            _ => isDescending ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id),
        };

        var items = await query
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new EquipmentDto { Id = x.Id, Code = x.Code, Name = x.Name })
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<EquipmentDto>> GetOptionsAsync(
        string? keyword, int take, CancellationToken cancellationToken) =>
        await ApplyKeyword(Equipments.AsNoTracking(), keyword)
            .OrderBy(x => x.Code)
            .Take(take)
            .Select(x => new EquipmentDto { Id = x.Id, Code = x.Code, Name = x.Name })
            .ToListAsync(cancellationToken);

    public Task<EquipmentDto?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Equipments.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new EquipmentDto { Id = x.Id, Code = x.Code, Name = x.Name })
            .FirstOrDefaultAsync(cancellationToken);

    public Task<EquipmentDto?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        Equipments.AsNoTracking()
            .Where(x => x.Code == code)
            .Select(x => new EquipmentDto { Id = x.Id, Code = x.Code, Name = x.Name })
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Equipment?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Equipments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, int? exceptId, CancellationToken cancellationToken) =>
        Equipments.AnyAsync(x => x.Code == code && (exceptId == null || x.Id != exceptId), cancellationToken);

    public async Task<IReadOnlyList<string>> GetExistingCodesAsync(
        IReadOnlyCollection<string> codes, CancellationToken cancellationToken)
    {
        if (codes.Count == 0)
        {
            return [];
        }

        // Danh mục cỡ vài nghìn mã: tải toàn bộ mã gọn hơn IN với danh sách tham số dài
        var allCodes = await Equipments.AsNoTracking().Select(x => x.Code).ToListAsync(cancellationToken);
        var lookup = new HashSet<string>(codes, StringComparer.OrdinalIgnoreCase);
        return allCodes.Where(lookup.Contains).ToList();
    }

    public void Add(Equipment equipment) => Equipments.Add(equipment);

    public void AddRange(IEnumerable<Equipment> equipments) => Equipments.AddRange(equipments);

    public void Remove(Equipment equipment) => Equipments.Remove(equipment);

    private static IQueryable<Equipment> ApplyKeyword(IQueryable<Equipment> query, string? keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return query;
        }

        var value = keyword.Trim();
        return query.Where(x => x.Code.Contains(value) || (x.Name != null && x.Name.Contains(value)));
    }
}
