namespace Server.Shared.Constants;

/// <summary>Tên các claim trong access token (JWT giữ nguyên tên, không map sang ClaimTypes của .NET).</summary>
public static class AppClaimTypes
{
    public const string UserId = "sub";
    public const string EmpCode = "emp_code";
    public const string FullName = "full_name";
    public const string SecurityStamp = "stamp";
}
