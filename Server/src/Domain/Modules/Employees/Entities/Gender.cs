namespace Server.Domain.Modules.Employees.Entities;

/// <summary>Giá trị cột Employee.Gender (lưu nguyên văn tiếng Việt như dữ liệu hiện có).</summary>
public static class Gender
{
    public const string Male = "Nam";
    public const string Female = "Nữ";

    public static readonly IReadOnlyCollection<string> All = [Male, Female];
}
