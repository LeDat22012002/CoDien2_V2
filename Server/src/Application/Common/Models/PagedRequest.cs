namespace Server.Application.Common.Models;

/// <summary>Lớp cha cho các <c>&lt;Entity&gt;FilterRequest</c>.</summary>
public abstract class PagedRequest
{
    private const int MaxPageSize = 200;
    private int _pageIndex = 1;
    private int _pageSize = 20;

    public int PageIndex
    {
        get => _pageIndex;
        set => _pageIndex = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = Math.Clamp(value, 1, MaxPageSize);
    }

    public string? Keyword { get; set; }
}
