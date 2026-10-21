using Server.Shared.Entities;

namespace Server.Modules.Incidents.Entities;

// ===== Entity =====

/// <summary>Báo cáo sự cố thiết bị (bảng cũ TEST.dbo.BaoCaoSuCo).</summary>
public class Incident : BaseEntity
{
    /// <summary>Xưởng = đơn vị cấp 1 trên sơ đồ tổ chức (OrgUnit.Id, không có FK vì OrgUnit là bảng có sẵn).</summary>
    public int? WorkshopId { get; set; }

    /// <summary>Kíp: A | B | C.</summary>
    public string Shift { get; set; } = string.Empty;

    /// <summary>Mã và tên thiết bị lưu dạng bản chụp lúc báo cáo (không đổi khi danh mục thiết bị sửa).</summary>
    public string EquipmentCode { get; set; } = string.Empty;

    public string EquipmentName { get; set; } = string.Empty;

    /// <summary>Tên thiết bị chi tiết bị sự cố (TenThietBi cũ).</summary>
    public string? DeviceName { get; set; }

    /// <summary>Thời điểm nhận thông tin.</summary>
    public DateTime? ReceivedAt { get; set; }

    /// <summary>Thời điểm bắt đầu sửa chữa.</summary>
    public DateTime? RepairStartedAt { get; set; }

    /// <summary>Thời điểm sửa chữa xong.</summary>
    public DateTime? RepairFinishedAt { get; set; }

    /// <summary>Thời điểm bàn giao.</summary>
    public DateTime? HandedOverAt { get; set; }

    /// <summary>Loại sự cố: Cơ | Điện | Công nghệ | Khác (dữ liệu cũ có thể khác).</summary>
    public string IncidentType { get; set; } = string.Empty;

    /// <summary>Dừng đến cấp: Không dừng | Thiết bị | Cụm thiết bị | Dây chuyền.</summary>
    public string StopLevel { get; set; } = string.Empty;

    /// <summary>Ảnh hưởng sản xuất.</summary>
    public bool AffectsProduction { get; set; }

    /// <summary>Mô tả sự cố.</summary>
    public string? Description { get; set; }

    /// <summary>Phương án xử lý.</summary>
    public string? Solution { get; set; }

    public decimal? Result { get; set; }
    public string? Note { get; set; }

    /// <summary>Nguyên nhân ban đầu.</summary>
    public string? Cause { get; set; }

    /// <summary>Nguyên nhân gốc sau phân tích.</summary>
    public string? RootCause { get; set; }

    /// <summary>Hành động khắc phục / phòng ngừa.</summary>
    public string? CorrectiveAction { get; set; }

    /// <summary>Thời điểm nhập báo cáo qua phần mềm (giờ địa phương). Null với dữ liệu import Excel → không tính vào thống kê.</summary>
    public DateTime? ReportedAt { get; set; }

    /// <summary>Người nhập (theo tài khoản đăng nhập). Null với dữ liệu import Excel.</summary>
    public string? ReporterEmpCode { get; set; }

    public string? ReporterName { get; set; }

    /// <summary>Số order sửa chữa.</summary>
    public string? OrderNumber { get; set; }

    /// <summary>Link biên bản sự cố.</summary>
    public string? ReportLink { get; set; }
}

// ===== Quy tắc =====

/// <summary>Ngưỡng cảnh báo của báo cáo sự cố (giữ như hệ thống cũ, FE dùng cùng giá trị).</summary>
public static class IncidentRules
{
    /// <summary>Quá N ngày kể từ khi nhập mà chưa đủ Nguyên nhân / Nguyên nhân gốc / Hành động.</summary>
    public const int AnalysisDueDays = 7;

    /// <summary>Sự cố ảnh hưởng sản xuất: quá N ngày mà còn thiếu Số order và/hoặc Link biên bản.</summary>
    public const int SupplementDueDays = 3;

    /// <summary>Một mã thiết bị có số sự cố trong năm LỚN HƠN ngưỡng này thì coi là lặp lại.</summary>
    public const int RepeatThreshold = 3;

    /// <summary>
    /// FE cũ tính dayjs().diff(reportedAt, 'day') &gt; N (lấy phần nguyên số ngày)
    /// ⇔ reportedAt ≤ now − (N + 1) ngày. Trả mốc đó để so sánh trực tiếp trong SQL.
    /// </summary>
    public static DateTime GetOverdueThreshold(DateTime now, int days) => now.AddDays(-(days + 1));

    /// <summary>Tỷ lệ % (0–100) làm tròn 2 chữ số; mẫu số 0 trả 0.</summary>
    public static double GetPercent(int part, int total) => total == 0 ? 0 : Math.Round(part * 100.0 / total, 2);
}
