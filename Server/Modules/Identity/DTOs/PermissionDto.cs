namespace Server.Modules.Identity.DTOs;

// ===== Response =====

public class PermissionDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Module { get; init; } = string.Empty;
    public int SortOrder { get; init; }
}

/// <summary>Nhóm quyền theo module, dùng cho màn ma trận phân quyền.</summary>
public class PermissionGroupDto
{
    public string Module { get; init; } = string.Empty;
    public IReadOnlyList<PermissionDto> Permissions { get; init; } = [];
}

// ===== Request =====

/// <summary>Mã quyền do code định nghĩa nên chỉ cho sửa tên hiển thị và thứ tự.</summary>
public class UpdatePermissionRequest
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
