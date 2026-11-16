namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

/// <summary>Phần chung của dòng kế hoạch / báo cáo.</summary>
public abstract class WorkItemDtoBase
{
    public int Id { get; set; }
    public int WeeklyFormId { get; set; }

    /// <summary>(1) TT trong nhóm đầu mục của đơn vị (chỉ có ở API lưới).</summary>
    public int? Tt { get; set; }

    public int WorkCategoryId { get; set; }

    /// <summary>(3) Giá trị dropdown đầu mục, vd "BT-LV1".</summary>
    public string CategoryCode { get; set; } = string.Empty;

    public string GroupLetter { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>(4) Mã công việc.</summary>
    public string Code { get; set; } = string.Empty;

    public int? EquipmentId { get; set; }
    public string? EquipmentCode { get; set; }
    public string? EquipmentName { get; set; }

    /// <summary>(6) Hạng mục công việc.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>(7) Ngày bắt đầu.</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>(7) Ngày kết thúc (bằng ngày bắt đầu = làm trong 1 ngày).</summary>
    public DateOnly EndDate { get; set; }

    /// <summary>(8) Số người = số phần tử Workers.</summary>
    public int WorkerCount { get; set; }

    /// <summary>(9) Người thực hiện.</summary>
    public IReadOnlyList<WorkItemWorkerDto> Workers { get; set; } = [];

    public string? Note { get; set; }
    public int SortOrder { get; set; }

    /// <summary>Base64, gửi lại khi sửa để phát hiện người khác đã sửa trước (409).</summary>
    public string RowVersion { get; set; } = string.Empty;

    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

/// <summary>Dòng kế hoạch.</summary>
public class WorkPlanItemDto : WorkItemDtoBase
{
    /// <summary>(11)</summary>
    public decimal? PlannedMinutes { get; set; }
}

/// <summary>Dòng báo cáo.</summary>
public class WorkReportItemDto : WorkItemDtoBase
{
    /// <summary>Dòng kế hoạch gốc; null = việc phát sinh.</summary>
    public int? PlanItemId { get; set; }

    /// <summary>Việc phát sinh (không lấy từ kế hoạch).</summary>
    public bool IsUnplanned { get; set; }

    /// <summary>(11) Giờ công kế hoạch chụp từ dòng kế hoạch.</summary>
    public decimal? PlannedMinutes { get; set; }

    /// <summary>(12) Giá trị đã nhập (null = chưa nhập, coi bằng kế hoạch).</summary>
    public decimal? ActualMinutes { get; set; }

    /// <summary>(12) dùng để hiển thị / cộng: thực tế, trống thì bằng kế hoạch.</summary>
    public decimal EffectiveActualMinutes { get; set; }

    /// <summary>(13) Chênh lệch = thực tế − kế hoạch.</summary>
    public decimal DiffMinutes { get; set; }

    public decimal? ResultPercent { get; set; }
    public string? WorkPermit { get; set; }
    public string? FiveS { get; set; }
    public string? Explanation { get; set; }
}

public class WorkItemWorkerDto
{
    /// <summary>Null = tên gõ tự do.</summary>
    public int? EmployeeId { get; set; }

    public string? EmpCode { get; set; }

    /// <summary>Tên hiện tại của nhân viên (nếu có Id) hoặc tên đã gõ.</summary>
    public string DisplayName { get; set; } = string.Empty;
}

/// <summary>Gợi ý người thực hiện.</summary>
public class WorkerOptionDto
{
    public int EmployeeId { get; set; }
    public string EmpCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string OrgUnitName { get; set; } = string.Empty;
    public string LevelName { get; set; } = string.Empty;
}

// ===== Request =====

/// <summary>Dữ liệu chung 1 dòng: (3)(5)(6)(7)(9)(18). Đầu mục cố định theo nhóm trên bảng.</summary>
public abstract class WorkItemRequestBase
{
    public int WorkCategoryId { get; set; }

    /// <summary>Có trong danh mục thiết bị thì tự gắn EquipmentId; không có = gõ tự do.</summary>
    public string? EquipmentCode { get; set; }

    /// <summary>Trống + mã có trong danh mục = lấy tên trong danh mục.</summary>
    public string? EquipmentName { get; set; }

    public string Description { get; set; } = string.Empty;

    public DateOnly? StartDate { get; set; }

    /// <summary>Trống = bằng ngày bắt đầu.</summary>
    public DateOnly? EndDate { get; set; }

    public List<WorkItemWorkerRequest> Workers { get; set; } = [];
    public string? Note { get; set; }

    /// <summary>Null khi thêm = xếp cuối.</summary>
    public int? SortOrder { get; set; }
}

public class WorkItemWorkerRequest
{
    /// <summary>Null = tên gõ tự do.</summary>
    public int? EmployeeId { get; set; }

    /// <summary>Bắt buộc khi gõ tự do; chọn nhân viên thì để trống = lấy họ tên nhân viên.</summary>
    public string? DisplayName { get; set; }
}

/// <summary>Thêm dòng kế hoạch: thêm (11).</summary>
public class PlanItemRequest : WorkItemRequestBase
{
    public decimal? PlannedMinutes { get; set; }
}

public class UpdatePlanItemRequest : PlanItemRequest
{
    /// <summary>RowVersion (base64) nhận được lần đọc trước.</summary>
    public string RowVersion { get; set; } = string.Empty;
}

/// <summary>Dòng báo cáo: (11)–(12)(14)–(17). (11) chỉ nhận với dòng thêm ở báo cáo (dòng từ kế hoạch giữ giờ KH).</summary>
public class ReportItemRequest : WorkItemRequestBase
{
    /// <summary>(11) Giờ công kế hoạch người nhập tự điền cho dòng thêm ở báo cáo (bắt buộc); bỏ qua với dòng từ kế hoạch.</summary>
    public decimal? PlannedMinutes { get; set; }

    /// <summary>(12) Trống = bằng giờ kế hoạch.</summary>
    public decimal? ActualMinutes { get; set; }
    public decimal? ResultPercent { get; set; }

    /// <summary>"Có" | "Không" | null (nhận cả "co", "khong").</summary>
    public string? WorkPermit { get; set; }

    public string? FiveS { get; set; }
    public string? Explanation { get; set; }
}

public class UpdateReportItemRequest : ReportItemRequest
{
    public string RowVersion { get; set; } = string.Empty;
}

/// <summary>Đưa các dòng kế hoạch (gợi ý) vào báo cáo: chép dòng + người thực hiện + vật tư, giữ mã công việc.</summary>
public class AcceptPlanItemsRequest
{
    public List<int> PlanItemIds { get; set; } = [];
}

/// <summary>Admin mở khóa kế hoạch / báo cáo đã quá hạn tới thời điểm Until; Until null = khóa lại ngay.</summary>
public class UnlockFormRequest
{
    public DateTime? Until { get; set; }
}

public class WorkerOptionFilterRequest
{
    public int UnitId { get; set; }

    /// <summary>UNIT (tổ/kíp) | TEAM (cả đội) | WORKSHOP (cả xưởng). Mặc định UNIT.</summary>
    public string? Scope { get; set; }

    /// <summary>Tìm theo họ tên / mã NV, không phân biệt dấu.</summary>
    public string? Keyword { get; set; }
}

// ===== Giá trị cố định =====

public static class WorkerOptionScopes
{
    public const string Unit = "UNIT";
    public const string Team = "TEAM";
    public const string Workshop = "WORKSHOP";

    public static readonly IReadOnlyCollection<string> All = [Unit, Team, Workshop];
}
