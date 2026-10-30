using Server.Shared.Models;

namespace Server.Modules.Incidents.DTOs;

// ===== Response =====

public class IncidentDto
{
    public int Id { get; init; }
    public int? WorkshopId { get; init; }
    public string? WorkshopName { get; init; }
    public string Shift { get; init; } = string.Empty;
    public string EquipmentCode { get; init; } = string.Empty;
    public string EquipmentName { get; init; } = string.Empty;
    public string? DeviceName { get; init; }
    public DateTime? ReceivedAt { get; init; }
    public DateTime? RepairStartedAt { get; init; }
    public DateTime? RepairFinishedAt { get; init; }
    public DateTime? HandedOverAt { get; init; }
    public string IncidentType { get; init; } = string.Empty;
    public string StopLevel { get; init; } = string.Empty;
    public bool AffectsProduction { get; init; }
    public string? Description { get; init; }
    public string? Solution { get; init; }
    public decimal? Result { get; init; }
    public string? Note { get; init; }
    public string? Cause { get; init; }
    public string? RootCause { get; init; }
    public string? CorrectiveAction { get; init; }
    public DateTime? ReportedAt { get; init; }
    public string? ReporterEmpCode { get; init; }
    public string? ReporterName { get; init; }
    public string? OrderNumber { get; init; }
    public string? ReportLink { get; init; }

    // Thông tin dẫn xuất (phút), không lưu DB

    /// <summary>Thời gian chờ: nhận thông tin → bắt đầu sửa.</summary>
    public double? WaitingMinutes => GetMinutes(ReceivedAt, RepairStartedAt);

    /// <summary>Thời gian sửa chữa: bắt đầu sửa → sửa xong.</summary>
    public double? RepairMinutes => GetMinutes(RepairStartedAt, RepairFinishedAt);

    /// <summary>Tổng thời gian dừng máy: nhận thông tin → bàn giao.</summary>
    public double? DowntimeMinutes => GetMinutes(ReceivedAt, HandedOverAt);

    private static double? GetMinutes(DateTime? from, DateTime? to) =>
        from.HasValue && to.HasValue ? Math.Round((to.Value - from.Value).TotalMinutes, 2) : null;
}

/// <summary>Xưởng (đơn vị cấp 1 đang hoạt động) cho ô chọn của báo cáo sự cố.</summary>
public class IncidentWorkshopDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public class IncidentImportResultDto
{
    public int TotalRows { get; set; }
    public int InsertedCount { get; set; }
    public List<string> Errors { get; init; } = [];
}

// ===== Request =====

/// <summary>Thông tin báo cáo do người nhập điền (không gồm phần phân tích).</summary>
public abstract class IncidentRequestBase
{
    /// <summary>Đơn vị cấp 1 (xưởng).</summary>
    public int? WorkshopId { get; set; }

    public string Shift { get; set; } = string.Empty;

    /// <summary>Phải có trong danh mục thiết bị.</summary>
    public string EquipmentCode { get; set; } = string.Empty;

    public string EquipmentName { get; set; } = string.Empty;
    public string? DeviceName { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime? RepairStartedAt { get; set; }
    public DateTime? RepairFinishedAt { get; set; }
    public DateTime? HandedOverAt { get; set; }
    public string IncidentType { get; set; } = string.Empty;
    public string StopLevel { get; set; } = string.Empty;
    public bool AffectsProduction { get; set; }
    public string? Description { get; set; }
    public string? Solution { get; set; }
    public decimal? Result { get; set; }
    public string? Note { get; set; }
    public string? OrderNumber { get; set; }
    public string? ReportLink { get; set; }
}

public class CreateIncidentRequest : IncidentRequestBase;

/// <summary>Sửa đầy đủ (chỉ người quản lý báo cáo sự cố).</summary>
public class UpdateIncidentRequest : IncidentRequestBase;

/// <summary>Người nhập cập nhật tiến độ: các mốc thời gian, mô tả, phương án xử lý.</summary>
public class UpdateIncidentProgressRequest
{
    public DateTime? ReceivedAt { get; set; }
    public DateTime? RepairStartedAt { get; set; }
    public DateTime? RepairFinishedAt { get; set; }
    public DateTime? HandedOverAt { get; set; }
    public string? Description { get; set; }
    public string? Solution { get; set; }
}

/// <summary>Phân tích kỹ thuật sau xử lý.</summary>
public class UpdateIncidentAnalysisRequest
{
    public string? Cause { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
}

/// <summary>Bổ sung thông tin hành chính sau xử lý.</summary>
public class UpdateIncidentSupplementRequest
{
    public string? OrderNumber { get; set; }
    public string? ReportLink { get; set; }
}

/// <summary>
/// Keyword tìm trong mã/tên thiết bị, mô tả, phương án, ghi chú. FromDate/ToDate theo thời điểm nhận thông tin.
/// OnlyMine: chỉ báo cáo do người đang đăng nhập nhập. SortBy: id | receivedAt | reportedAt | equipmentCode | shift | incidentType.
/// </summary>
public class IncidentFilterRequest : PagedRequest
{
    public int? WorkshopId { get; set; }
    public string? Shift { get; set; }
    public string? EquipmentCode { get; set; }
    public string? IncidentType { get; set; }
    public string? StopLevel { get; set; }
    public bool? AffectsProduction { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public bool OnlyMine { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}

/// <summary>Cấu hình đọc 1 sheet khi import; cột đánh số từ 1 (A = 1), 0 = không đọc cột đó.</summary>
public class IncidentImportSheetConfig
{
    public string SheetName { get; set; } = string.Empty;

    /// <summary>Xưởng gán cho mọi dòng của sheet.</summary>
    public int WorkshopId { get; set; }

    public int StartRow { get; set; } = 2;

    /// <summary>0 = đọc tới dòng cuối có dữ liệu.</summary>
    public int EndRow { get; set; }

    /// <summary>Năm cho ô ngày không ghi năm; 0 = năm hiện tại.</summary>
    public int DefaultYear { get; set; }

    public int ShiftColumn { get; set; } = 2;
    public int EquipmentCodeColumn { get; set; } = 3;
    public int EquipmentNameColumn { get; set; } = 4;
    public int DeviceNameColumn { get; set; } = 5;
    public int ReceivedAtColumn { get; set; } = 6;
    public int RepairStartedAtColumn { get; set; } = 7;
    public int RepairFinishedAtColumn { get; set; } = 8;
    public int HandedOverAtColumn { get; set; } = 9;
    public int IncidentTypeColumn { get; set; } = 10;
    public int StopLevelColumn { get; set; } = 11;
    public int AffectsProductionColumn { get; set; } = 12;
    public int DescriptionColumn { get; set; } = 13;
    public int SolutionColumn { get; set; } = 14;
    public int CauseColumn { get; set; } = 15;
    public int RootCauseColumn { get; set; } = 16;
    public int CorrectiveActionColumn { get; set; } = 17;
    public int ResultColumn { get; set; } = 18;
    public int NoteColumn { get; set; } = 19;
}
