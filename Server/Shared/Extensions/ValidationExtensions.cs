using Server.Shared.Exceptions;

namespace Server.Shared.Extensions;

public static class ValidationExtensions
{
    /// <summary>Có lỗi thì ném ValidationException (middleware trả 400 kèm danh sách lỗi theo trường).</summary>
    public static void ThrowIfInvalid(this Dictionary<string, string[]> errors)
    {
        if (errors.Count > 0)
        {
            throw new ValidationException("Dữ liệu không hợp lệ.", errors);
        }
    }
}
