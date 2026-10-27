using Server.Modules.Identity.DTOs;

namespace Server.Modules.Identity.Services;

/// <summary>Dựng cây menu từ danh sách trang phẳng, dùng cho menu quản trị (/auth/me) và menu trang công khai.</summary>
internal static class PageMenuBuilder
{
    /// <summary>Nút nhóm (không có Path/ExternalUrl) bị bỏ nếu không còn trang con nào hiển thị.</summary>
    public static List<MenuItemDto> Build(IReadOnlyList<PageDto> pages, int? parentId = null) =>
        pages
            .Where(x => x.ParentId == parentId)
            .Select(x => new MenuItemDto
            {
                Code = x.Code,
                Title = x.Title,
                Path = x.Path,
                ExternalUrl = x.ExternalUrl,
                Icon = x.Icon,
                Children = Build(pages, x.Id),
            })
            .Where(x => x.Path is not null || x.ExternalUrl is not null || x.Children.Count > 0)
            .ToList();
}
