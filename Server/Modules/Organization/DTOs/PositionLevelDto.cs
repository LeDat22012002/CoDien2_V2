namespace Server.Modules.Organization.DTOs;

// ===== Response =====

public class PositionLevelDto
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public short Rank { get; init; }
    public int ChartRow { get; init; }

    /// <summary>CARD | BLOCK.</summary>
    public string DisplayMode { get; init; } = string.Empty;

    public string? BlockLabel { get; init; }
}

// ===== Request =====

/// <summary>Sửa cấp bậc: tên, thứ tự, hàng trên sơ đồ, cách hiển thị. Không đổi được Code.</summary>
public class UpdatePositionLevelRequest
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Nhỏ = cấp cao.</summary>
    public short Rank { get; set; }

    /// <summary>Hàng 1–6 trên sơ đồ.</summary>
    public byte ChartRow { get; set; }

    public string DisplayMode { get; set; } = string.Empty;
    public string? BlockLabel { get; set; }
}
