using Server.Api.Common;
using Server.Application.Common.Exceptions;
using Server.Domain.Exceptions;

namespace Server.Api.Middlewares;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            await WriteErrorAsync(context, GetStatusCode(ex), ApiResponse.Fail(ex.Message, ex.Errors));
        }
        catch (DomainException ex)
        {
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, ApiResponse.Fail(ex.Message));
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client đã hủy request, không cần phản hồi
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi chưa xử lý tại {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError,
                ApiResponse.Fail("Đã xảy ra lỗi hệ thống, vui lòng thử lại sau."));
        }
    }

    private static int GetStatusCode(AppException ex) => ex switch
    {
        NotFoundException => StatusCodes.Status404NotFound,
        UnauthorizedException => StatusCodes.Status401Unauthorized,
        ForbiddenException => StatusCodes.Status403Forbidden,
        _ => StatusCodes.Status400BadRequest,
    };

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, ApiResponse<object> response)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(response);
    }
}
