namespace Server.Modules.Organization.DTOs;

// ===== Response =====

public class OrgUnitDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? ShortName { get; init; }
    public string TypeCode { get; init; } = string.Empty;
    public int? ParentId { get; init; }

    /// <summary>Ghi đè cấp trưởng; null = theo loại đơn vị.</summary>
    public string? HeadLevelCode { get; init; }

    public string? DisciplineCode { get; init; }
    public string? Area { get; init; }
    public string? Shift { get; init; }
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public string? Note { get; init; }
}

// ===== Request =====

/// <summary>Các trường sửa được của đơn vị (Code, TypeCode chỉ nhập khi tạo).</summary>
public abstract class OrgUnitRequestBase
{
    public string Name { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public int? ParentId { get; set; }

    /// <summary>Để trống = theo loại đơn vị.</summary>
    public string? HeadLevelCode { get; set; }

    /// <summary>CK | DIEN | CD.</summary>
    public string? DisciplineCode { get; set; }

    public string? Area { get; set; }

    /// <summary>A | B | C.</summary>
    public string? Shift { get; set; }

    public int SortOrder { get; set; }
    public string? Note { get; set; }
}

public class CreateOrgUnitRequest : OrgUnitRequestBase
{
    public string Code { get; set; } = string.Empty;

    /// <summary>FACTORY | WORKSHOP | TEAM | SHIFT | SECTION | GROUP.</summary>
    public string TypeCode { get; set; } = string.Empty;
}

public class UpdateOrgUnitRequest : OrgUnitRequestBase;

/// <summary>Sắp xếp lại các đơn vị con của 1 đơn vị cha: OrderedIds = toàn bộ Id con theo thứ tự mới.</summary>
public class ReorderOrgUnitsRequest
{
    public int ParentId { get; set; }
    public List<int> OrderedIds { get; set; } = [];
}

public class OrgUnitFilterRequest
{
    public int? ParentId { get; set; }
    public string? TypeCode { get; set; }
    public bool IncludeInactive { get; set; }
}
