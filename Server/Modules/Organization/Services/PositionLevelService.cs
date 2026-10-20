using Server.Data;
using Server.Modules.Organization.DTOs;
using Server.Modules.Organization.Entities;
using Server.Modules.Organization.Repositories.Interfaces;
using Server.Modules.Organization.Services.Interfaces;
using Server.Modules.Organization.Validators;
using Server.Shared.Exceptions;

namespace Server.Modules.Organization.Services;

/// <summary>Cấu hình cấp bậc. Đổi ChartRow = đổi hàng hiển thị của mọi đơn vị / người thuộc cấp đó trên sơ đồ.</summary>
public class PositionLevelService(IPositionLevelRepository positionLevelRepository, IUnitOfWork unitOfWork)
    : IPositionLevelService
{
    /// <summary>Hàng cố định của Ban Giám đốc — bố cục sơ đồ vẽ riêng 2 hàng này.</summary>
    private static readonly Dictionary<string, byte> FixedRows = new()
    {
        [PositionLevelCodes.Director] = 1,
        [PositionLevelCodes.DeputyDirector] = 2,
    };

    public async Task<IReadOnlyList<PositionLevelDto>> GetListAsync(CancellationToken cancellationToken) =>
        (await positionLevelRepository.GetListAsync(cancellationToken)).Select(ToDto).ToList();

    public async Task<PositionLevelDto> UpdateAsync(
        string code, UpdatePositionLevelRequest request, CancellationToken cancellationToken)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.DisplayMode = request.DisplayMode?.Trim().ToUpperInvariant() ?? string.Empty;
        request.BlockLabel = string.IsNullOrWhiteSpace(request.BlockLabel) ? null : request.BlockLabel.Trim();
        PositionLevelRequestValidator.Validate(request);

        var level = await positionLevelRepository.FindByCodeAsync(code, cancellationToken)
            ?? throw new NotFoundException($"Không tìm thấy cấp bậc '{code}'.");

        if (FixedRows.TryGetValue(level.Code, out var fixedRow) && request.ChartRow != fixedRow)
        {
            throw new BusinessException($"{level.Name} luôn ở hàng {fixedRow} trên sơ đồ, không đổi được.");
        }

        level.Name = request.Name;
        level.Rank = request.Rank;
        level.ChartRow = request.ChartRow;
        level.DisplayMode = request.DisplayMode;
        level.BlockLabel = request.BlockLabel;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(level);
    }

    internal static PositionLevelDto ToDto(PositionLevel level) => new()
    {
        Code = level.Code,
        Name = level.Name,
        Rank = level.Rank,
        ChartRow = level.ChartRow,
        DisplayMode = level.DisplayMode,
        BlockLabel = level.BlockLabel,
    };
}
