namespace Server.Modules.Organization.Entities;

/// <summary>Loại đơn vị nào được nằm dưới loại nào (vd TEAM nằm dưới FACTORY hoặc WORKSHOP).</summary>
public class OrgUnitTypeParent
{
    public string ChildTypeCode { get; set; } = string.Empty;
    public string ParentTypeCode { get; set; } = string.Empty;
}
