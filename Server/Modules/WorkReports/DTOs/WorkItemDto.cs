namespace Server.Modules.WorkReports.DTOs;

// ===== Response =====

public class WorkItemDto
{
    public int Id { get; init; }
    public int WeeklyFormId { get; init; }

    /// <summary>(1) TT trong nhóm đầu mục của đơn vị (chỉ có ở API lưới).</summary>
    public int? Tt { get; init; }

    public int WorkCategoryId { get; init; }

    /// <summary>(3) Giá trị dropdown đầu mục, vd "BT-LV1".</summary>
    public string CategoryCode { get; init; } = string.Empty;

    public string GroupLetter { get; init; } = string.Empty;
    public string CategoryName { get; init; } = string.Empty;

    /// <summary>(4) Mã công việc.</summary>
    public string Code { get; init; } = string.Empty;

    public int? EquipmentId { get; init; }
    public string? EquipmentCode { get; init; }
    public string? EquipmentName { get; init; }

    /// <summary>(6) Hạng mục công việc.</summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>(7) Ngày thực hiện.</summary>
    public DateOnly WorkDate { get; init; }

    /// <summary>(8) Số người = số phần tử Workers.</summary>
    public int WorkerCount { get; init; }

    /// <summary>(9) Người thực hiện.</summary>
    public IReadOnlyList<WorkItemWorkerDto> Workers { get; init; } = [];

    /// <summary>(11)</summary>
    public decimal? PlannedMinutes { get; init; }

    /// <summary>(12) Giá trị đã nhập (null = chưa nhập, coi bằng kế hoạch).</summary>
    public decimal? ActualMinutes { get; init; }

    /// <summary>(12) dùng để hiển thị / cộng: thực tế, trống thì bằng kế hoạch.</summary>
    public decimal EffectiveActualMinutes { get; init; }

    /// <summary>(13) Chênh lệch = thực tế − kế hoạch.</summary>
    public decimal DiffMinutes { get; init; }

    public decimal? ResultPercent { get; init; }
    public string? WorkPermit { get; init; }
    public string? FiveS { get; init; }
    public string? Explanation { get; init; }
    public string? Note { get; init; }
    public bool IsUnplanned { get; init; }
    public int SortOrder { get; init; }

    /// <summary>Base64, gửi lại khi sửa để phát hiện người khác đã sửa trước (409).</summary>
    public string RowVersion { get; init; } = string.Empty;

    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
}

public class WorkItemWorkerDto
{
    /// <summary>Null = tên gõ tự do.</summary>
    public int? EmployeeId { get; init; }

    public string? EmpCode { get; init; }

    /// <summary>Tên hiện tại của nhân viên (nếu có Id) hoặc tên đã gõ.</summary>
    public string DisplayName { get; init; } = string.Empty;
}

/// <summary>Kết quả dán nhiều dòng: dòng hợp lệ đã lưu, dòng lỗi trả lỗi theo cột để sửa rồi gửi lại.</summary>
public class BatchCreateWorkItemsResultDto
{
    public IReadOnlyList<WorkItemDto> Created { get; init; } = [];
    public IReadOnlyList<PastedRowErrorDto> Errors { get; init; } = [];
}

public class PastedRowErrorDto
{
    /// <summary>RowIndex client gửi lên.</summary>
    public int RowIndex { get; init; }

    /// <summary>Key = tên cột camelCase (category, workDate, plannedMinutes…).</summary>
    public IDictionary<string, string[]> Errors { get; init; } = new Dictionary<string, string[]>();
}

/// <summary>Gợi ý người thực hiện.</summary>
public class WorkerOptionDto
{
    public int EmployeeId { get; init; }
    public string EmpCode { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string OrgUnitName { get; init; } = string.Empty;
    public string LevelName { get; init; } = string.Empty;
}

// ===== Request =====

/// <summary>
/// Dữ liệu 1 dòng. Trường không thuộc giai đoạn đang ghi được bỏ qua:
/// PLAN nhận (3)(5)(6)(7)(9)(11)(18); REPORT nhận (5)(6)(7)(9)(12)(14)–(18), dòng phát sinh nhận thêm (3), không có (11).
/// </summary>
public abstract class WorkItemRequestBase
{
    public int WorkCategoryId { get; set; }

    /// <summary>Có trong danh mục thiết bị thì tự gắn EquipmentId; không có = gõ tự do.</summary>
    public string? EquipmentCode { get; set; }

    /// <summary>Trống + mã có trong danh mục = lấy tên trong danh mục.</summary>
    public string? EquipmentName { get; set; }

    public string Description { get; set; } = string.Empty;
    public DateOnly? WorkDate { get; set; }
    public List<WorkItemWorkerRequest> Workers { get; set; } = [];
    public decimal? PlannedMinutes { get; set; }
    public decimal? ActualMinutes { get; set; }
    public decimal? ResultPercent { get; set; }

    /// <summary>"Có" | "Không" | null (nhận cả "co", "khong").</summary>
    public string? WorkPermit { get; set; }

    public string? FiveS { get; set; }
    public string? Explanation { get; set; }
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

public class CreateWorkItemRequest : WorkItemRequestBase;

public class UpdateWorkItemRequest : WorkItemRequestBase
{
    /// <summary>RowVersion (base64) nhận được lần đọc trước.</summary>
    public string RowVersion { get; set; } = string.Empty;
}

/// <summary>Dán từ Excel: mỗi ô là chuỗi thô, server chuẩn hóa.</summary>
public class BatchCreateWorkItemsRequest
{
    public List<PastedWorkItemRow> Rows { get; set; } = [];
}

public class PastedWorkItemRow
{
    /// <summary>Chỉ số dòng phía client, trả lại trong lỗi.</summary>
    public int RowIndex { get; set; }

    /// <summary>(3) Đầu mục: khớp giá trị dropdown / tên / hậu tố, không phân biệt dấu, hoa thường.</summary>
    public string? Category { get; set; }

    public string? EquipmentCode { get; set; }
    public string? EquipmentName { get; set; }
    public string? Description { get; set; }

    /// <summary>dd/MM/yyyy, d/M, số ngày Excel, hoặc chuỗi có ngày (lấy ngày đầu tiên).</summary>
    public string? WorkDate { get; set; }

    /// <summary>Tên cách nhau dấu phẩy / chấm phẩy / xuống dòng.</summary>
    public string? Workers { get; set; }

    /// <summary>Số phút, hoặc "8h" = số người × 8 × 60.</summary>
    public string? PlannedMinutes { get; set; }

    public string? ActualMinutes { get; set; }
    public string? ResultPercent { get; set; }
    public string? WorkPermit { get; set; }
    public string? FiveS { get; set; }
    public string? Explanation { get; set; }
    public string? Note { get; set; }
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
