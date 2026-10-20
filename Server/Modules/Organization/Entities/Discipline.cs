namespace Server.Modules.Organization.Entities;

/// <summary>Chuyên môn: CK (Cơ khí), DIEN (Điện), CD (Cơ điện).</summary>
public class Discipline
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
