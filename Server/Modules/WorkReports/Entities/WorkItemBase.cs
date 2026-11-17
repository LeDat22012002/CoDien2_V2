using Server.Shared.Entities;

namespace Server.Modules.WorkReports.Entities;

/// <summary>
/// Phần chung của dòng kế hoạch (<see cref="WorkPlanItem"/>) và dòng báo cáo (<see cref="WorkReportItem"/>).
/// Không phải entity riêng: mỗi lớp con có bảng riêng. Không lưu: số người (đếm Workers), tuần (theo form).
/// </summary>
public abstract class WorkItemBase<TWorker> : BaseEntity
    where TWorker : WorkItemWorkerBase
{
    public int WeeklyFormId { get; set; }

    public int WorkCategoryId { get; set; }

    /// <summary>{Tiền tố}-{Hậu tố đầu mục}-{STT:D2}, vd TCDKB-LV3-07. Kế hoạch và báo cáo dùng chung bộ đếm của form.</summary>
    public string Code { get; set; } = string.Empty;

    public int CodeSeq { get; set; }

    /// <summary>Id thiết bị khi mã có trong danh mục; null = gõ tự do.</summary>
    public int? EquipmentId { get; set; }

    public string? EquipmentCode { get; set; }

    /// <summary>Bản chụp tên thiết bị.</summary>
    public string? EquipmentName { get; set; }

    /// <summary>(6) Hạng mục công việc.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>(7) Ngày bắt đầu, trong thứ 2 → Chủ nhật của tuần.</summary>
    public DateOnly StartDate { get; set; }

    /// <summary>(7) Ngày kết thúc (≥ ngày bắt đầu, trong tuần); bằng ngày bắt đầu = làm trong 1 ngày.</summary>
    public DateOnly EndDate { get; set; }

    /// <summary>
    /// (9) "Cả tổ": người thực hiện là cả tổ/kíp. Workers là bản chụp nhân viên của tổ/kíp trên sơ đồ lúc lưu
    /// (số người = số nhân viên); hiển thị chữ "Cả tổ" thay cho danh sách tên.
    /// </summary>
    public bool IsWholeUnit { get; set; }

    /// <summary>
    /// (10) KTV phụ trách dòng: mặc định người nhập, chọn thêm kỹ sư được phân công tổ/kíp cùng làm.
    /// Lưu JSON trên dòng (bản chụp họ tên lúc lưu). Rỗng = dòng nhập trước 17/11/2026, hiển thị KTV của form.
    /// </summary>
    public List<WorkItemEngineer> Engineers { get; set; } = [];

    /// <summary>(18) Ghi chú.</summary>
    public string? Note { get; set; }

    public int SortOrder { get; set; }

    /// <summary>rowversion của SQL Server: chống ghi đè khi nhiều người sửa cùng dòng.</summary>
    public byte[] RowVersion { get; set; } = [];

    public WeeklyForm WeeklyForm { get; set; } = null!;

    public WorkCategory WorkCategory { get; set; } = null!;

    public ICollection<TWorker> Workers { get; set; } = [];
}

/// <summary>1 KTV phụ trách của dòng (phần tử JSON trong cột Engineers).</summary>
public class WorkItemEngineer
{
    public int EmployeeId { get; set; }

    /// <summary>Họ tên lúc lưu.</summary>
    public string FullName { get; set; } = string.Empty;
}

/// <summary>
/// Người thực hiện của 1 dòng. Bảng con, xóa cứng (lưu dòng là ghi lại cả danh sách).
/// EmployeeId null = tên gõ tự do; có Id thì hiển thị tên hiện tại của nhân viên.
/// </summary>
public abstract class WorkItemWorkerBase
{
    public int Id { get; set; }

    public int? EmployeeId { get; set; }

    /// <summary>Tên lúc nhập (bắt buộc); dùng khi gõ tự do hoặc nhân viên không còn.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
