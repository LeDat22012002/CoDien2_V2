using System.Globalization;
using System.Text;

namespace Server.Modules.WorkReports.Services;

/// <summary>Chuẩn hóa chữ tiếng Việt để so khớp (bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng).</summary>
public static class TextNormalizer
{
    public static string RemoveDiacritics(string value)
    {
        var normalized = value.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(c);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>Khóa so khớp: bỏ dấu, chữ thường, gộp khoảng trắng. Vd "BT  Phần ứng" → "bt phan ung".</summary>
    public static string ToKey(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : string.Join(' ', RemoveDiacritics(value).ToLowerInvariant()
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    /// <summary>Trim; chuỗi rỗng → null.</summary>
    public static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
