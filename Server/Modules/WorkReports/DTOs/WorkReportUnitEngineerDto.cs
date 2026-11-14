namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkReportUnitEngineerDto
{
    public int Id { get; init; }
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public DateOnly StartDate { get; init; }
}

/// <summary>Kỹ sư gợi ý từ sơ đồ tổ chức (cấp KS ở tổ/kíp, và ở đội chứa tổ).</summary>
public class EngineerSuggestionDto
{
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;

    /// <summary>Đã là kỹ sư phụ trách đơn vị này.</summary>
    public bool IsAssigned { get; init; }
}

// ===== Request =====

/// <summary>Danh sách kỹ sư phụ trách mới (lưu cả danh sách): người bỏ ra kết thúc từ hôm nay, người thêm vào bắt đầu từ hôm nay.</summary>
public class SetUnitEngineersRequest
{
    public List<int> EmployeeIds { get; set; } = [];
}