using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Modules.Materials.DTOs;
using Server.Modules.Materials.Entities;
using Server.Modules.Materials.Repositories.Interfaces;

namespace Server.Modules.Materials.Repositories;

public class MaterialRepository(AppDbContext dbContext) : IMaterialRepository
{
    private DbSet<Material> Materials => dbContext.Set<Material>();

    private static readonly Expression<Func<Material, MaterialDto>> ToDto = x => new MaterialDto
    {
        Id = x.Id,
        Code = x.Code,
        Description = x.Description,
        BasicDataText = x.BasicDataText,
        Plant = x.Plant,
        MaterialGroup = x.MaterialGroup,
        Class = x.Class,
        Level = x.Level,
        MaterialLevel = x.MaterialLevel,
        DocumentNo = x.DocumentNo,
        TypeOfSupplies = x.TypeOfSupplies,
        Uom = x.Uom,
    };

    private static readonly Expression<Func<Material, MaterialOptionDto>> ToOption = x => new MaterialOptionDto
    {
        Id = x.Id,
        Code = x.Code!,
        Description = x.Description,
        Uom = x.Uom,
        Plant = x.Plant,
    };

    public async Task<(IReadOnlyList<MaterialDto> Items, int TotalCount)> GetPagedAsync(
        MaterialFilterRequest filter, CancellationToken cancellationToken)
    {
        var query = Materials.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(x =>
                (x.Code != null && x.Code.Contains(keyword))
                || (x.Description != null && x.Description.Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Plant))
        {
            var plant = filter.Plant.Trim();
            query = query.Where(x => x.Plant == plant);
        }

        if (!string.IsNullOrWhiteSpace(filter.MaterialGroup))
        {
            var materialGroup = filter.MaterialGroup.Trim();
            query = query.Where(x => x.MaterialGroup == materialGroup);
        }

        if (!string.IsNullOrWhiteSpace(filter.TypeOfSupplies))
        {
            var typeOfSupplies = filter.TypeOfSupplies.Trim();
            query = query.Where(x => x.TypeOfSupplies == typeOfSupplies);
        }

        if (!string.IsNullOrWhiteSpace(filter.MaterialLevel))
        {
            var materialLevel = filter.MaterialLevel.Trim();
            query = query.Where(x => x.MaterialLevel == materialLevel);
        }

        if (filter.MissingUom == true)
        {
            query = query.Where(x => x.Uom == null || x.Uom == "");
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var isDescending = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        query = filter.SortBy?.ToLowerInvariant() switch
        {
            "id" => isDescending ? query.OrderByDescending(x => x.Id) : query.OrderBy(x => x.Id),
            "description" => isDescending
                ? query.OrderByDescending(x => x.Description).ThenByDescending(x => x.Id)
                : query.OrderBy(x => x.Description).ThenBy(x => x.Id),
            "plant" => isDescending
                ? query.OrderByDescending(x => x.Plant).ThenByDescending(x => x.Code)
                : query.OrderBy(x => x.Plant).ThenBy(x => x.Code),
            "materialgroup" => isDescending
                ? query.OrderByDescending(x => x.MaterialGroup).ThenByDescending(x => x.Code)
                : query.OrderBy(x => x.MaterialGroup).ThenBy(x => x.Code),
            "typeofsupplies" => isDescending
                ? query.OrderByDescending(x => x.TypeOfSupplies).ThenByDescending(x => x.Code)
                : query.OrderBy(x => x.TypeOfSupplies).ThenBy(x => x.Code),
            _ => isDescending
                ? query.OrderByDescending(x => x.Code).ThenByDescending(x => x.Id)
                : query.OrderBy(x => x.Code).ThenBy(x => x.Id),
        };

        var items = await query
            .Skip((filter.PageIndex - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(ToDto)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<MaterialOptionDto>> GetOptionsAsync(
        string keyword, int take, CancellationToken cancellationToken) =>
        await Materials.AsNoTracking()
            .Where(x => x.Code != null && x.Code != ""
                        && (x.Code.Contains(keyword) || (x.Description != null && x.Description.Contains(keyword))))
            .OrderBy(x => x.Code == keyword ? 0 : x.Code!.StartsWith(keyword) ? 1 : 2)
            .ThenBy(x => x.Code)
            .ThenBy(x => x.Id)
            .Take(take)
            .Select(ToOption)
            .ToListAsync(cancellationToken);

    public Task<MaterialOptionDto?> GetByCodeAsync(string code, CancellationToken cancellationToken) =>
        Materials.AsNoTracking()
            .Where(x => x.Code == code)
            .OrderBy(x => x.Uom == null || x.Uom == "" ? 1 : 0)
            .ThenBy(x => x.Id)
            .Select(ToOption)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<MaterialDto?> GetByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ToDto)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Material?> FindByIdAsync(int id, CancellationToken cancellationToken) =>
        Materials.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<bool> IsCodeTakenAsync(string code, string? plant, int? exceptId, CancellationToken cancellationToken) =>
        Materials.AnyAsync(
            x => x.Code == code
                 && (plant == null ? x.Plant == null : x.Plant == plant)
                 && (exceptId == null || x.Id != exceptId),
            cancellationToken);

    public async Task<MaterialLookupsDto> GetLookupsAsync(CancellationToken cancellationToken) => new()
    {
        Plants = await DistinctValuesAsync(x => x.Plant, cancellationToken),
        MaterialGroups = await DistinctValuesAsync(x => x.MaterialGroup, cancellationToken),
        TypesOfSupplies = await DistinctValuesAsync(x => x.TypeOfSupplies, cancellationToken),
        MaterialLevels = await DistinctValuesAsync(x => x.MaterialLevel, cancellationToken),
    };

    public void Add(Material material) => Materials.Add(material);

    public void Remove(Material material) => Materials.Remove(material);

    /// <summary>Các giá trị khác rỗng của 1 cột, sắp xếp tăng dần (DbContext không chạy song song nên đọc lần lượt).</summary>
    private async Task<IReadOnlyList<string>> DistinctValuesAsync(
        Expression<Func<Material, string?>> selector, CancellationToken cancellationToken) =>
        await Materials.AsNoTracking()
            .Select(selector)
            .Where(x => x != null && x != "")
            .Distinct()
            .OrderBy(x => x)
            .Select(x => x!)
            .ToListAsync(cancellationToken);
}