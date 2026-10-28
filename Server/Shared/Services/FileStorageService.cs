namespace Server.Shared.Services;

/// <summary>
/// Lưu file tải lên vào thư mục ngoài mã nguồn (cấu hình FileStorage:RootPath, mặc định D:/Uploads)
/// để deploy lại không mất ảnh; phục vụ tĩnh tại <see cref="PublicPath"/>.
/// </summary>
public class FileStorageService(IConfiguration configuration) : IFileStorageService
{
    /// <summary>Đặt dưới /api để đi chung proxy/IIS với API.</summary>
    public const string PublicPath = "/api/uploads";

    private const string DefaultRootPath = "D:/Uploads";

    public static string GetRootPath(IConfiguration configuration) =>
        Path.GetFullPath(configuration["FileStorage:RootPath"] is { Length: > 0 } rootPath ? rootPath : DefaultRootPath);

    public async Task<string> SaveAsync(
        IFormFile file, string folder, string fileName, CancellationToken cancellationToken)
    {
        var directory = Path.Combine(GetRootPath(configuration), folder);
        Directory.CreateDirectory(directory);

        var fullName = fileName + Path.GetExtension(file.FileName).ToLowerInvariant();
        await using (var stream = File.Create(Path.Combine(directory, fullName)))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return $"{PublicPath}/{folder}/{fullName}";
    }

    public void Delete(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) || !url.StartsWith(PublicPath + "/", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var rootPath = GetRootPath(configuration);
        var filePath = Path.GetFullPath(Path.Combine(rootPath, url[(PublicPath.Length + 1)..]));

        // Chặn URL chứa "../" trỏ ra ngoài thư mục upload
        if (filePath.StartsWith(rootPath.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar,
                StringComparison.OrdinalIgnoreCase)
            && File.Exists(filePath))
        {
            File.Delete(filePath);
        }
    }
}
