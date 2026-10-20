using Server.Modules.Employees.Entities;

namespace Server.Modules.Organization.Entities;

// ===== Entity =====

/// <summary>Ai giữ chức vụ gì, ở đơn vị nào, từ ngày nào đến ngày nào (có lịch sử).</summary>
public class EmployeeAssignment
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }

    /// <summary>KS của Đội → Đội; KS theo ca → Nhóm theo ca; Tổ trưởng → Tổ.</summary>
    public int OrgUnitId { get; set; }

    public string LevelCode { get; set; } = string.Empty;
    public string? JobTitle { get; set; }

    /// <summary>False = kiêm nhiệm.</summary>
    public bool IsPrimary { get; set; } = true;

    /// <summary>"Quyền ..." (giữ chức tạm thời).</summary>
    public bool IsActing { get; set; }

    public DateOnly StartDate { get; set; }

    /// <summary>Null = đang hiệu lực.</summary>
    public DateOnly? EndDate { get; set; }

    public string ChangeType { get; set; } = AssignmentChangeTypes.Init;
    public string? DecisionNo { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }

    public Employee Employee { get; set; } = null!;
    public OrgUnit OrgUnit { get; set; } = null!;
    public PositionLevel Level { get; set; } = null!;
}

// ===== Giá trị cố định =====

public static class AssignmentChangeTypes
{
    /// <summary>Dữ liệu ban đầu khi nạp hệ thống.</summary>
    public const string Init = "INIT";

    public const string Appoint = "APPOINT";
    public const string Promote = "PROMOTE";
    public const string Demote = "DEMOTE";
    public const string Transfer = "TRANSFER";
    public const string Acting = "ACTING";

    /// <summary>Các loại được phép khi đổi chức vụ qua API.</summary>
    public static readonly IReadOnlyCollection<string> AllowedForChange = [Appoint, Promote, Demote, Transfer, Acting];
}
