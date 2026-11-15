namespace Server.Shared.Exceptions;

/// <summary>Exception nghiệp vụ gốc; middleware ở Api map từng loại sang HTTP status.</summary>
public abstract class AppException(string message, IDictionary<string, string[]>? errors = null) : Exception(message)
{
    public IDictionary<string, string[]>? Errors { get; } = errors;
}

public class BusinessException(string message) : AppException(message);

public class ValidationException(string message, IDictionary<string, string[]> errors) : AppException(message, errors);

public class NotFoundException(string message) : AppException(message);

public class UnauthorizedException(string message) : AppException(message);

public class ForbiddenException(string message) : AppException(message);

/// <summary>Xung đột ghi đồng thời (dữ liệu đã bị người khác sửa) → 409, kèm dữ liệu mới nhất để client hiển thị lại.</summary>
public class ConflictException(string message, object? latestData = null) : AppException(message)
{
    public object? LatestData { get; } = latestData;
}
