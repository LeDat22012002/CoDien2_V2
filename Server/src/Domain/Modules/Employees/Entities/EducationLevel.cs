namespace Server.Domain.Modules.Employees.Entities;

/// <summary>Giá trị cột Employee.EducationLevel (mã viết tắt như dữ liệu hiện có).</summary>
public static class EducationLevel
{
    public const string University = "ĐH";
    public const string College = "CĐ";
    public const string Intermediate = "TC";
    public const string Elementary = "SC";
    public const string SkilledWorker = "CNKT";

    public static readonly IReadOnlyCollection<string> All = [University, College, Intermediate, Elementary, SkilledWorker];
}
