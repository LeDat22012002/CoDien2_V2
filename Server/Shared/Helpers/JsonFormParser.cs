using System.Text.Json;
using Server.Shared.Exceptions;

namespace Server.Shared.Helpers;

/// <summary>Đọc trường JSON gửi kèm multipart/form-data (vd cấu hình sheet khi import Excel).</summary>
public static class JsonFormParser
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    /// <summary>Nhận cả mảng lẫn 1 object đơn (tiện khi thử trên Swagger); rỗng hoặc sai định dạng → BusinessException.</summary>
    public static IReadOnlyList<T> ParseList<T>(string? json, string fieldLabel)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new BusinessException($"Chưa nhập {fieldLabel}.");
        }

        List<T>? items;
        try
        {
            var text = json.Trim();
            items = text.StartsWith('[')
                ? JsonSerializer.Deserialize<List<T>>(text, Options)
                : JsonSerializer.Deserialize<T>(text, Options) is { } single ? [single] : null;
        }
        catch (JsonException ex)
        {
            throw new BusinessException($"{fieldLabel} không đúng định dạng JSON: {ex.Message}");
        }

        if (items is null || items.Count == 0)
        {
            throw new BusinessException($"{fieldLabel} rỗng.");
        }

        return items;
    }
}
