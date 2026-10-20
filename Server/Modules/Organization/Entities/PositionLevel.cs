namespace Server.Modules.Organization.Entities;

// ===== Entity =====

/// <summary>Cấp bậc chức vụ (GD, PGD, QD, PQD, DT, DP, TK, KS, CV, TT, NV); quyết định hàng và cách hiển thị trên sơ đồ.</summary>
public class PositionLevel
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>Nhỏ = cấp cao.</summary>
    public short Rank { get; set; }

    /// <summary>Hàng trên sơ đồ: 1 GĐ · 2 PGĐ · 3 QĐ/PQĐ · 4 ĐT/ĐP · 5 TK/KS/CV · 6 TT/NV.</summary>
    public byte ChartRow { get; set; }

    public string DisplayMode { get; set; } = DisplayModes.Card;

    /// <summary>Tên khối khi DisplayMode = BLOCK.</summary>
    public string? BlockLabel { get; set; }

    public bool IsActive { get; set; } = true;
}

// ===== Giá trị cố định =====

public static class DisplayModes
{
    /// <summary>Thẻ có ảnh.</summary>
    public const string Card = "CARD";

    /// <summary>Khối gộp nhiều người.</summary>
    public const string Block = "BLOCK";

    public static readonly IReadOnlyCollection<string> All = [Card, Block];
}

public static class PositionLevelCodes
{
    public const string Director = "GD";
    public const string DeputyDirector = "PGD";
    public const string Engineer = "KS";
}
