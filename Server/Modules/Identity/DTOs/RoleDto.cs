namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class RoleSummaryDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public class RoleDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsSystem { get; init; }
    public bool IsActive { get; init; }
    public int UserCount { get; init; }
    public int PermissionCount { get; init; }
}

public class RoleDetailDto : RoleDto
{
    public IReadOnlyList<int> PermissionIds { get; init; } = [];
}

// ===== Request =====

public abstract class RoleRequestBase
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public List<int> PermissionIds { get; set; } = [];
}

/// <summary>Code viết hoa, không dấu, dùng '_' (vd HR_STAFF); không đổi sau khi tạo.</summary>
public class CreateRoleRequest : RoleRequestBase
{
    public string Code { get; set; } = string.Empty;
}

public class UpdateRoleRequest : RoleRequestBase;
