using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Controllers;
using Server.Modules.AuditLogs.Entities;
using Server.Modules.AuditLogs.Services;
using Server.Modules.AuditLogs.Services.Interfaces;

namespace Server.Api.Middlewares;

/// <summary>
/// Ghi nhật ký đăng nhập và mọi thao tác thêm/sửa/xóa (POST/PUT/PATCH/DELETE /api/...) của người đã đăng nhập:
/// người làm, API, dữ liệu gửi lên (che mật khẩu / token), mã HTTP, thông báo trả về, thời gian xử lý.
/// Đặt ngoài cùng (trước ExceptionHandlingMiddleware) để thấy kết quả cuối của request.
/// Request chưa đăng nhập (trừ đăng nhập) không ghi: thường là token hết hạn, Client tự refresh rồi gửi lại.
/// </summary>
public class AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
{
    private const string LoginPath = "/api/auth/login";
    private const string MaskedValue = "***";

    /// <summary>Đọc tối đa từng này ký tự body JSON (đủ cho form nghiệp vụ, tránh đọc file lớn).</summary>
    private const int MaxRequestBodyChars = 64 * 1024;

    /// <summary>Response lớn hơn thì không đọc thông báo (vd file tải về).</summary>
    private const int MaxResponseBytesToParse = 256 * 1024;

    private static readonly HashSet<string> AuditedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch, HttpMethods.Delete,
    };

    /// <summary>Refresh token chạy ngầm 15 phút/lần; lượt mở trang đã có API ghi riêng.</summary>
    private static readonly HashSet<string> ExcludedPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/refresh",
        "/api/audit-logs/page-views",
    };

    /// <summary>Tên trường chứa một trong các từ này bị che giá trị.</summary>
    private static readonly string[] SensitiveKeywords = ["password", "token", "secret"];

    public async Task InvokeAsync(HttpContext context, IAuditLogQueue auditLogQueue)
    {
        var request = context.Request;
        if (!AuditedMethods.Contains(request.Method)
            || !request.Path.StartsWithSegments("/api")
            || ExcludedPaths.Contains(request.Path.Value ?? string.Empty))
        {
            await next(context);
            return;
        }

        var isLogin = request.Path.Equals(LoginPath, StringComparison.OrdinalIgnoreCase);
        var startedAt = Stopwatch.GetTimestamp();
        var requestBody = await ReadRequestBodyAsync(request);

        // Đệm response để đọc thông báo trả về rồi mới chép ra client
        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        try
        {
            await next(context);
        }
        finally
        {
            context.Response.Body = originalBody;
            var responseJson = ParseResponse(context.Response, buffer);
            buffer.Position = 0;
            await buffer.CopyToAsync(originalBody);

            if (isLogin || context.User.Identity?.IsAuthenticated == true)
            {
                try
                {
                    var log = BuildLog(context, isLogin, requestBody, responseJson, startedAt);
                    auditLogQueue.Enqueue(log);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Không tạo được nhật ký cho {Method} {Path}", request.Method, request.Path);
                }
            }
        }
    }

    private static AuditLog BuildLog(
        HttpContext context, bool isLogin, JsonNode? requestBody, JsonNode? responseJson, long startedAt)
    {
        var request = context.Request;
        var log = AuditLogFactory.Create(
            context, isLogin ? AuditLogTypes.Login : AuditLogTypes.Action, $"{request.Path}{request.QueryString}");

        var action = context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
        log.Method = request.Method.ToUpperInvariant();
        log.Endpoint = action is null ? null : $"{action.ControllerName}.{action.ActionName}";
        log.StatusCode = context.Response.StatusCode;
        log.IsSuccess = context.Response.StatusCode < StatusCodes.Status400BadRequest;
        log.Message = AuditLogFactory.Truncate(GetString(responseJson, "message"), AuditLogLimits.MessageMaxLength);
        log.RequestBody = AuditLogFactory.Truncate(requestBody?.ToJsonString(), AuditLogLimits.RequestBodyMaxLength);
        log.DurationMs = (int)Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds;

        // Đăng nhập: chưa có token nên lấy người dùng từ kết quả (thành công) hoặc mã đã gõ (thất bại)
        if (isLogin)
        {
            var user = responseJson?["data"]?["user"];
            log.UserId = user?["id"]?.GetValue<int>();
            log.EmpCode = GetString(user, "empCode") ?? GetString(requestBody, "empCode")?.Trim();
            log.FullName = GetString(user, "fullName");
        }

        return log;
    }

    /// <summary>JSON: đọc body (cho phép đọc lại); form: ghi các trường và tên / dung lượng file. Đã che trường nhạy cảm.</summary>
    private static async Task<JsonNode?> ReadRequestBodyAsync(HttpRequest request)
    {
        try
        {
            if (request.HasFormContentType)
            {
                var form = await request.ReadFormAsync();
                var result = new JsonObject();
                foreach (var (key, value) in form)
                {
                    result[key] = ParseFormValue(value.ToString());
                }

                if (form.Files.Count > 0)
                {
                    result["files"] = new JsonArray(form.Files
                        .Select(file => (JsonNode)new JsonObject
                        {
                            ["name"] = file.Name,
                            ["fileName"] = file.FileName,
                            ["size"] = file.Length,
                        })
                        .ToArray());
                }

                return Mask(result);
            }

            if (request.ContentType?.Contains("json", StringComparison.OrdinalIgnoreCase) != true)
            {
                return null;
            }

            request.EnableBuffering();
            using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
            var chars = new char[MaxRequestBodyChars];
            var length = await reader.ReadBlockAsync(chars, 0, chars.Length);
            request.Body.Position = 0;

            if (length == 0)
            {
                return null;
            }

            // Body quá dài bị cắt thì không còn là JSON hợp lệ: chỉ ghi chú, không lưu thô (có thể lộ mật khẩu)
            return length == MaxRequestBodyChars
                ? JsonValue.Create("(Dữ liệu quá lớn, không lưu)")
                : Mask(JsonNode.Parse(new string(chars, 0, length)));
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or IOException)
        {
            return JsonValue.Create("(Không đọc được dữ liệu gửi lên)");
        }
    }

    /// <summary>Trường form chứa JSON (vd configs khi import) thì giữ dạng JSON để dễ đọc.</summary>
    private static JsonNode? ParseFormValue(string value)
    {
        var trimmed = value.TrimStart();
        if (trimmed.StartsWith('{') || trimmed.StartsWith('['))
        {
            try
            {
                return JsonNode.Parse(value);
            }
            catch (JsonException)
            {
                // Không phải JSON: giữ chuỗi gốc
            }
        }

        return JsonValue.Create(value);
    }

    private static JsonNode? Mask(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject jsonObject:
                foreach (var key in jsonObject.Select(x => x.Key).ToList())
                {
                    if (SensitiveKeywords.Any(keyword => key.Contains(keyword, StringComparison.OrdinalIgnoreCase)))
                    {
                        jsonObject[key] = MaskedValue;
                    }
                    else
                    {
                        Mask(jsonObject[key]);
                    }
                }

                break;
            case JsonArray jsonArray:
                foreach (var item in jsonArray)
                {
                    Mask(item);
                }

                break;
        }

        return node;
    }

    private static JsonNode? ParseResponse(HttpResponse response, MemoryStream buffer)
    {
        if (buffer.Length == 0
            || buffer.Length > MaxResponseBytesToParse
            || response.ContentType?.Contains("json", StringComparison.OrdinalIgnoreCase) != true)
        {
            return null;
        }

        try
        {
            buffer.Position = 0;
            return JsonNode.Parse(buffer);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? GetString(JsonNode? node, string propertyName) =>
        node is JsonObject jsonObject
        && jsonObject.TryGetPropertyValue(propertyName, out var value)
        && value is JsonValue jsonValue
        && jsonValue.TryGetValue<string>(out var text)
            ? text
            : null;
}
