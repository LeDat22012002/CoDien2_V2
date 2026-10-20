namespace Server.Modules.Organization.DTOs;

// ===== Response =====

/// <summary>1 dòng lịch sử chức vụ.</summary>
public class AssignmentHistoryDto
{
    public int AssignmentId { get; init; }
    public DateOnly StartDate { get; init; }

    /// <summary>Null = đang giữ.</summary>
    public DateOnly? EndDate { get; init; }

    public string ChangeType { get; init; } = string.Empty;
    public string? DecisionNo { get; init; }
    public string OrgUnitCode { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;
    public string? JobTitle { get; init; }
    public bool IsActing { get; init; }
    public bool IsPrimary { get; init; }
}

// ===== Request =====

/// <summary>
/// Đổi chức vụ / điều chuyển / bổ nhiệm / giao quyền. Vị trí chính đang giữ kết thúc vào ngày trước ngày hiệu lực,
/// vị trí mới bắt đầu từ ngày hiệu lực. Vd chuyển Kỹ sư sang Đội khác: NewOrgUnitCode = mã Đội, NewLevelCode = KS, ChangeType = TRANSFER.
/// </summary>
public class ChangeAssignmentRequest
{
    public string EmpCode { get; set; } = string.Empty;
    public string NewOrgUnitCode { get; set; } = string.Empty;
    public string NewLevelCode { get; set; } = string.Empty;
    public DateOnly EffectiveDate { get; set; }

    /// <summary>APPOINT | PROMOTE | DEMOTE | TRANSFER | ACTING.</summary>
    public string ChangeType { get; set; } = string.Empty;

    public string? JobTitle { get; set; }

    /// <summary>"Quyền ..."; ChangeType = ACTING luôn là true.</summary>
    public bool IsActing { get; set; }

    public string? DecisionNo { get; set; }
    public string? Note { get; set; }
}

/// <summary>Thôi giữ 1 vị trí.</summary>
public class EndAssignmentRequest
{
    public DateOnly EndDate { get; set; }
    public string? Note { get; set; }
}
