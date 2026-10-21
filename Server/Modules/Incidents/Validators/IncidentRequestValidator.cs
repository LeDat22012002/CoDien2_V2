using Server.Modules.Incidents.DTOs;
using Server.Shared.Extensions;

namespace Server.Modules.Incidents.Validators;

public static class IncidentRequestValidator
{
    public const int LongTextMaxLength = 4000;

    public static void Validate(IncidentRequestBase request)
    {
        var errors = new Dictionary<string, string[]>();

        AddRequired(errors, "shift", request.Shift, 20, "Kíp");
        AddRequired(errors, "equipmentCode", request.EquipmentCode, 50, "Mã thiết bị");
        AddRequired(errors, "equipmentName", request.EquipmentName, 255, "Tên thiết bị");
        AddRequired(errors, "incidentType", request.IncidentType, 100, "Loại sự cố");
        AddRequired(errors, "stopLevel", request.StopLevel, 100, "Dừng đến cấp");
        AddMaxLength(errors, "deviceName", request.DeviceName, 255, "Tên thiết bị chi tiết");
        AddMaxLength(errors, "description", request.Description, LongTextMaxLength, "Mô tả sự cố");
        AddMaxLength(errors, "solution", request.Solution, LongTextMaxLength, "Phương án xử lý");
        AddMaxLength(errors, "note", request.Note, LongTextMaxLength, "Ghi chú");
        AddMaxLength(errors, "orderNumber", request.OrderNumber, 100, "Số order");
        AddMaxLength(errors, "reportLink", request.ReportLink, 500, "Link biên bản");
        AddTimelineErrors(
            errors, request.ReceivedAt, request.RepairStartedAt, request.RepairFinishedAt, request.HandedOverAt);

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateIncidentProgressRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddMaxLength(errors, "description", request.Description, LongTextMaxLength, "Mô tả sự cố");
        AddMaxLength(errors, "solution", request.Solution, LongTextMaxLength, "Phương án xử lý");
        AddTimelineErrors(
            errors, request.ReceivedAt, request.RepairStartedAt, request.RepairFinishedAt, request.HandedOverAt);

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateIncidentAnalysisRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddMaxLength(errors, "cause", request.Cause, LongTextMaxLength, "Nguyên nhân");
        AddMaxLength(errors, "rootCause", request.RootCause, LongTextMaxLength, "Nguyên nhân gốc");
        AddMaxLength(errors, "correctiveAction", request.CorrectiveAction, LongTextMaxLength, "Hành động khắc phục");

        errors.ThrowIfInvalid();
    }

    public static void Validate(UpdateIncidentSupplementRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        AddMaxLength(errors, "orderNumber", request.OrderNumber, 100, "Số order");
        AddMaxLength(errors, "reportLink", request.ReportLink, 500, "Link biên bản");

        errors.ThrowIfInvalid();
    }

    /// <summary>Nhận thông tin ≤ Bắt đầu sửa ≤ Sửa xong ≤ Bàn giao; mốc trống bỏ qua.</summary>
    private static void AddTimelineErrors(
        Dictionary<string, string[]> errors,
        DateTime? receivedAt, DateTime? repairStartedAt, DateTime? repairFinishedAt, DateTime? handedOverAt)
    {
        (string Key, string Label, DateTime? Value)[] milestones =
        [
            ("receivedAt", "Thời điểm nhận thông tin", receivedAt),
            ("repairStartedAt", "Thời điểm bắt đầu sửa chữa", repairStartedAt),
            ("repairFinishedAt", "Thời điểm sửa chữa xong", repairFinishedAt),
            ("handedOverAt", "Thời điểm bàn giao", handedOverAt),
        ];

        for (var later = 1; later < milestones.Length; later++)
        {
            for (var earlier = 0; earlier < later; earlier++)
            {
                if (milestones[earlier].Value is { } earlierValue
                    && milestones[later].Value is { } laterValue
                    && earlierValue > laterValue)
                {
                    errors[milestones[later].Key] =
                        [$"{milestones[later].Label} không được nhỏ hơn {milestones[earlier].Label.ToLowerInvariant()}."];
                    break;
                }
            }
        }
    }

    private static void AddRequired(
        Dictionary<string, string[]> errors, string key, string? value, int maxLength, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} không được để trống."];
        }
        else
        {
            AddMaxLength(errors, key, value, maxLength, label);
        }
    }

    private static void AddMaxLength(
        Dictionary<string, string[]> errors, string key, string? value, int maxLength, string label)
    {
        if (value?.Length > maxLength)
        {
            errors[key] = [$"{label} tối đa {maxLength} ký tự."];
        }
    }
}
