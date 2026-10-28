namespace Server.Shared.Services;

/// <summary>Lưu file người dùng tải lên vào thư mục FileStorage:RootPath, phục vụ tĩnh tại <see cref="FileStorageService.PublicPath"/>.</summary>
public interface IFileStorageService
{
    /// <summary>Lưu file vào {RootPath}/{folder}/{fileName}{phần mở rộng gốc}; trả về URL công khai.</summary>
    Task<string> SaveAsync(IFormFile file, string folder, string fileName, CancellationToken cancellationToken);

    /// <summary>Xóa file theo URL do <see cref="SaveAsync"/> trả về; URL khác (link ngoài) thì bỏ qua.</summary>
    void Delete(string? url);
}
