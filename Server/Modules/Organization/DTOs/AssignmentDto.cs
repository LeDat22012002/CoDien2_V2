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

/// <summary>1 vị trí đang giữ (từ vUnitMember), dùng cho danh sách / chi tiết nhân viên.</summary>
public class CurrentAssignmentDto
{
    public int AssignmentId { get; init; }
    public int EmployeeId { get; init; }
    public int OrgUnitId { get; init; }
    public string OrgUnitCode { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;
    public string LevelCode { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;
    public string? JobTitle { get; init; }
    public bool IsActing { get; init; }
    public bool IsPrimary { get; init; }
    public DateOnly StartDate { get; init; }

    /// <summary>HEAD | DEPUTY | MEMBER (vai trò trong đơn vị, xem UnitRoles).</summary>
    public string UnitRole { get; init; } = string.Empty;

    /// <summary>Loại đơn vị của vị trí: WORKSHOP | TEAM | SHIFT | GROUP…</summary>
    public string OrgUnitTypeCode { get; init; } = string.Empty;
}

/// <summary>Người đang giữ vị trí trong đơn vị (từ vUnitMember); module khác dùng để gợi ý người theo đơn vị.</summary>
public class UnitMemberSummaryDto
{
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public int OrgUnitId { get; init; }
    public string OrgUnitName { get; init; } = string.Empty;
    public string LevelCode { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;

    /// <summary>HEAD | DEPUTY | MEMBER.</summary>
    public string UnitRole { get; init; } = string.Empty;

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
