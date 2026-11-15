using Server.Modules.Organization.DTOs;
using Server.Modules.WorkReports.Validators;

namespace Server.Modules.WorkReports.Services;

/// <summary>Gợi ý tiền tố mã công việc cho đơn vị báo cáo và tránh trùng trong xưởng.</summary>
public static class WorkReportUnitPrefixes
{
    /// <summary>Từ bỏ đi khi gợi ý tiền tố (đã bỏ dấu, viết hoa).</summary>
    private static readonly HashSet<string> StopWords = ["TO", "KIP", "NHOM", "THEO", "CA", "DOI"];

    /// <summary>
    /// Gợi ý từ tên viết tắt (hoặc tên): bỏ dấu, bỏ các từ "Tổ/Kíp/Nhóm/theo ca/Đội";
    /// còn 1 cụm thì giữ nguyên (vd "CK-TBMP"), nhiều cụm thì lấy chữ cái đầu (vd "cơ điện B" → "CDB").
    /// </summary>
    public static string Suggest(OrgUnitDto orgUnit)
    {
        var source = TextNormalizer.RemoveDiacritics(orgUnit.ShortName ?? orgUnit.Name).ToUpperInvariant();
        var words = source
            .Split([' ', '_', ',', '(', ')'], StringSplitOptions.RemoveEmptyEntries)
            .Where(x => !StopWords.Contains(x) && x.Any(char.IsLetterOrDigit))
            .ToList();

        var prefix = words.Count switch
        {
            0 => orgUnit.Code,
            1 => words[0],
            _ => string.Concat(words.Select(x => x[0])),
        };

        // Kíp: thêm ca nếu chưa có ở cuối
        if (orgUnit.Shift is { Length: > 0 } shift && !prefix.EndsWith(shift, StringComparison.OrdinalIgnoreCase))
        {
            prefix += shift.ToUpperInvariant();
        }

        prefix = new string(prefix.Where(c => char.IsLetterOrDigit(c) || c is '-' or '.').ToArray()).Trim('-', '.');
        return Truncate(prefix.Length == 0 ? "DV" : prefix, WorkReportUnitRequestValidator.CodePrefixMaxLength);
    }

    /// <summary>Thêm hậu tố -2, -3… khi tiền tố đã dùng trong xưởng (so sánh không phân biệt hoa thường).</summary>
    public static string MakeUnique(string prefix, IReadOnlySet<string> usedPrefixes)
    {
        if (!usedPrefixes.Contains(prefix))
        {
            return prefix;
        }

        for (var i = 2; ; i++)
        {
            var suffix = $"-{i}";
            var candidate = Truncate(prefix, WorkReportUnitRequestValidator.CodePrefixMaxLength - suffix.Length) + suffix;
            if (!usedPrefixes.Contains(candidate))
            {
                return candidate;
            }
        }
    }

    private static string Truncate(string value, int maxLength) => value.Length > maxLength ? value[..maxLength] : value;
}
