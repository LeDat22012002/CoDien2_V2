namespace Server.Modules.Incidents.DTOs;

// ===== Response =====

/// <summary>Dashboard báo cáo sự cố của 1 năm (theo thời điểm nhập), toàn nhà máy hoặc 1 xưởng.</summary>
public class IncidentDashboardDto
{
    public int Year { get; set; }

    /// <summary>Có giá trị khi xem dashboard của 1 xưởng.</summary>
    public int? WorkshopId { get; set; }

    public string? WorkshopName { get; set; }

    public int TotalCount { get; set; }

    /// <summary>Số báo cáo có ít nhất 1 cảnh báo quá hạn (mỗi báo cáo đếm 1 lần).</summary>
    public int OverdueCount { get; set; }

    public double OverduePercent { get; set; }
    public int AnalysisOverdueCount { get; set; }
    public int SupplementOverdueCount { get; set; }

    /// <summary>Số mã thiết bị có số sự cố trong năm vượt ngưỡng lặp lại.</summary>
    public int RepeatedEquipmentCount { get; set; }

    public int RepeatThreshold { get; set; }

    public List<GroupStatisticDto> ByIncidentType { get; set; } = [];
    public List<GroupStatisticDto> ByShift { get; set; } = [];
    public List<GroupStatisticDto> ByStopLevel { get; set; } = [];
    public ProductionImpactDto ProductionImpact { get; set; } = new();

    /// <summary>Chỉ có khi xem toàn nhà máy.</summary>
    public List<WorkshopStatisticDto> ByWorkshop { get; set; } = [];
}

/// <summary>Dòng thống kê theo nhóm (loại sự cố, kíp, dừng đến cấp); % trên tổng số báo cáo.</summary>
public class GroupStatisticDto
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percent { get; set; }
}

public class ProductionImpactDto
{
    public int AffectedCount { get; set; }
    public double AffectedPercent { get; set; }
    public int NotAffectedCount { get; set; }
    public double NotAffectedPercent { get; set; }
}

public class WorkshopStatisticDto
{
    public int? WorkshopId { get; set; }
    public string? WorkshopName { get; set; }
    public int Count { get; set; }

    /// <summary>% số sự cố của xưởng trên tổng số báo cáo.</summary>
    public double Percent { get; set; }

    public int OverdueCount { get; set; }

    /// <summary>Quá 7 ngày chưa đủ Nguyên nhân / Nguyên nhân gốc / Hành động.</summary>
    public int AnalysisOverdueCount { get; set; }

    /// <summary>Ảnh hưởng sản xuất, quá 3 ngày chưa đủ Số order / Link biên bản.</summary>
    public int SupplementOverdueCount { get; set; }

    /// <summary>% quá hạn trên số sự cố của chính xưởng.</summary>
    public double OverduePercent { get; set; }

    /// <summary>% quá hạn của xưởng trên tổng số báo cáo quá hạn.</summary>
    public double OverdueShareOfTotal { get; set; }
}

public class RepeatedEquipmentDto
{
    public string EquipmentCode { get; set; } = string.Empty;
    public string? EquipmentName { get; set; }
    public string? DeviceName { get; set; }
    public int? WorkshopId { get; set; }
    public string? WorkshopName { get; set; }

    /// <summary>Số lần xảy ra sự cố trong năm.</summary>
    public int Count { get; set; }

    /// <summary>Thời điểm nhập của lần gần nhất.</summary>
    public DateTime? LastReportedAt { get; set; }
}

/// <summary>Dòng đếm theo xưởng (repository → service).</summary>
public class WorkshopCountRow
{
    public int? WorkshopId { get; set; }
    public int Count { get; set; }
    public int OverdueCount { get; set; }
    public int AnalysisOverdueCount { get; set; }
    public int SupplementOverdueCount { get; set; }
}

// ===== Request =====

/// <summary>Year bỏ trống = năm hiện tại; WorkshopId bỏ trống = toàn nhà máy.</summary>
public class IncidentDashboardFilterRequest
{
    public int? Year { get; set; }
    public int? WorkshopId { get; set; }
}

/// <summary>Threshold: số lần phải VƯỢT để coi là lặp lại, bỏ trống = 3 (tức từ 4 lần).</summary>
public class RepeatedEquipmentFilterRequest
{
    public int? Year { get; set; }
    public int? WorkshopId { get; set; }
    public int? Threshold { get; set; }
}
