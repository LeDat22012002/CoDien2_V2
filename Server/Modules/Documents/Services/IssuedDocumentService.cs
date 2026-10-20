using ClosedXML.Excel;
using Server.Data;
using Server.Modules.Documents.DTOs;
using Server.Modules.Documents.Entities;
using Server.Modules.Documents.Repositories.Interfaces;
using Server.Modules.Documents.Services.Interfaces;
using Server.Modules.Documents.Validators;
using Server.Modules.Organization.Services.Interfaces;
using Server.Shared.Constants;
using Server.Shared.Exceptions;
using Server.Shared.Models;
using Server.Shared.Services;

namespace Server.Modules.Documents.Services;

/// <summary>
/// Cấp số văn bản. Công thức số hiệu giữ nguyên như hệ thống cũ (VanBanLaySoService):
/// - Thường:              {STT}/{Năm}/{Đuôi số}                     — STT theo biểu mẫu + năm
/// - Hồ sơ nghiệm thu:    {Lần NT}/{Số HĐ}/{Tên viết tắt}           — đếm theo đuôi "/Số HĐ/Tên viết tắt"
/// - Xác nhận kỹ thuật:   XNKT.{STT}-{Năm}/{Số PR}/{Nhà thầu}       — STT theo biểu mẫu + năm
/// - Phương án kỹ thuật:  {STT}/{Năm}/PAKT-NM.CĐ2-{Nhà thầu}        — STT theo biểu mẫu + năm
/// - Thanh toán theo HĐ:  {STT}/{Số HĐ}/{Năm HĐ}/{Đuôi số}          — STT theo biểu mẫu + hợp đồng
/// Năm lấy theo giờ Việt Nam của server → sang năm mới STT tự về 01.
/// Đọc số lớn nhất có khóa dòng trong transaction để 2 người cấp cùng lúc không trùng số.
/// </summary>
public class IssuedDocumentService(
    IIssuedDocumentRepository documentRepository,
    IDocumentTemplateRepository templateRepository,
    IAssignmentService assignmentService,
    IPermissionChecker permissionChecker,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork) : IIssuedDocumentService
{
    private const string TechnicalPlanMiddle = "PAKT-NM.CĐ2";

    // ===== Cấp số =====

    public Task<IssueResultDto> IssueStandardAsync(
        IssueStandardDocumentRequest request, CancellationToken cancellationToken)
    {
        NormalizeCommon(request);
        IssuedDocumentRequestValidator.Validate(request);

        return IssueAsync(request, null, async (template, year, ct) =>
        {
            var sequence = await GetNextSequenceAsync(template.Id, year, ct);
            return new NumberPlan(sequence, year, $"{sequence:D2}/{year}/{template.NumberSuffix}");
        }, cancellationToken);
    }

    public Task<IssueResultDto> IssueAcceptanceRecordAsync(
        IssueAcceptanceRecordRequest request, CancellationToken cancellationToken)
    {
        NormalizeCommon(request);
        request.ContractNumber = request.ContractNumber?.Trim() ?? string.Empty;
        request.ShortName = request.ShortName?.Trim() ?? string.Empty;
        IssuedDocumentRequestValidator.Validate(request);

        return IssueAsync(request, null, async (_, _, ct) =>
        {
            // Như hệ thống cũ: đếm số lần nghiệm thu theo đuôi "/Số HĐ/Tên viết tắt", không theo năm
            var ending = $"/{request.ContractNumber}/{request.ShortName}";
            var existingNumbers = await documentRepository.GetNumbersEndingWithLockAsync(ending, ct);
            var maxCount = existingNumbers
                .Select(x => x.Split('/'))
                .Where(parts => parts.Length >= 3 && int.TryParse(parts[0], out _))
                .Select(parts => int.Parse(parts[0]))
                .DefaultIfEmpty(0)
                .Max();

            var count = maxCount + 1;
            return new NumberPlan(0, 0, $"{count:D2}{ending}", count);
        }, cancellationToken);
    }

    public Task<IssueResultDto> IssueTechnicalConfirmationAsync(
        IssueTechnicalConfirmationRequest request, CancellationToken cancellationToken)
    {
        NormalizeCommon(request);
        request.PrNumber = request.PrNumber?.Trim() ?? string.Empty;
        request.Contractor = request.Contractor?.Trim() ?? string.Empty;
        IssuedDocumentRequestValidator.Validate(request);

        return IssueAsync(request, null, async (template, year, ct) =>
        {
            var sequence = await GetNextSequenceAsync(template.Id, year, ct);
            return new NumberPlan(sequence, year, $"XNKT.{sequence:D2}-{year}/{request.PrNumber}/{request.Contractor}");
        }, cancellationToken);
    }

    public Task<IssueResultDto> IssueTechnicalPlanAsync(
        IssueTechnicalPlanRequest request, CancellationToken cancellationToken)
    {
        NormalizeCommon(request);
        request.Contractor = request.Contractor?.Trim() ?? string.Empty;
        IssuedDocumentRequestValidator.Validate(request);

        return IssueAsync(request, null, async (template, year, ct) =>
        {
            var sequence = await GetNextSequenceAsync(template.Id, year, ct);
            return new NumberPlan(sequence, year, $"{sequence:D2}/{year}/{TechnicalPlanMiddle}-{request.Contractor}");
        }, cancellationToken);
    }

    public Task<IssueResultDto> IssueContractPaymentAsync(
        IssueContractPaymentRequest request, CancellationToken cancellationToken)
    {
        NormalizeCommon(request);
        request.ContractNumber = request.ContractNumber?.Trim() ?? string.Empty;
        IssuedDocumentRequestValidator.Validate(request);

        return IssueAsync(request, request.ContractNumber, async (template, _, ct) =>
        {
            var latest = await documentRepository.GetLatestByContractWithLockAsync(
                template.Id, request.ContractNumber, ct);

            int sequence;
            int contractYear;
            if (request.IsNew)
            {
                // Hợp đồng mới: STT 01, năm lấy theo năm ký hợp đồng FE gửi lên
                if (latest is not null)
                {
                    throw new BusinessException(
                        "Số hợp đồng này đã được cấp số trước đó, vui lòng chọn 'Không phải mới' để tăng số thứ tự.");
                }

                sequence = 1;
                contractYear = request.Year!.Value;
            }
            else
            {
                // Hợp đồng đã có: tăng STT, năm giữ theo lần cấp trước
                if (latest is null)
                {
                    throw new BusinessException("Không tìm thấy số hợp đồng đã cấp trước đó để tăng số thứ tự.");
                }

                sequence = latest.SequenceNumber + 1;
                contractYear = latest.Year;
            }

            return new NumberPlan(
                sequence, contractYear, $"{sequence:D2}/{request.ContractNumber}/{contractYear}/{template.NumberSuffix}");
        }, cancellationToken);
    }

    // ===== Tra cứu / quản lý =====

    public async Task<PagedResult<IssuedDocumentDto>> GetPagedAsync(
        IssuedDocumentFilterRequest filter, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await documentRepository.GetPagedAsync(filter, cancellationToken);

        return new PagedResult<IssuedDocumentDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = filter.PageIndex,
            PageSize = filter.PageSize,
        };
    }

    public async Task<IReadOnlyList<string>> GetContractNumbersAsync(int templateId, CancellationToken cancellationToken)
    {
        _ = await templateRepository.GetByIdAsync(templateId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy biểu mẫu.");

        return await documentRepository.GetContractNumbersAsync(templateId, cancellationToken);
    }

    public async Task UpdateAsync(int id, UpdateIssuedDocumentRequest request, CancellationToken cancellationToken)
    {
        request.Subject = NullIfEmpty(request.Subject);
        request.Note = NullIfEmpty(request.Note);
        request.PublishStatus = NullIfEmpty(request.PublishStatus)?.ToUpperInvariant();
        request.EOfficeLink = NullIfEmpty(request.EOfficeLink);
        IssuedDocumentRequestValidator.Validate(request);

        var document = await documentRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy văn bản.");

        await EnsureCanEditAsync(document, cancellationToken);

        // Như hệ thống cũ: trường để trống thì giữ nguyên
        document.Subject = request.Subject ?? document.Subject;
        document.Note = request.Note ?? document.Note;
        document.PublishStatus = request.PublishStatus ?? document.PublishStatus;
        document.EOfficeLink = request.EOfficeLink ?? document.EOfficeLink;

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var document = await documentRepository.FindByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy văn bản cần xóa.");

        var maxSequence = await documentRepository.GetMaxSequenceAsync(
            document.DocumentTemplateId, document.Year, cancellationToken) ?? 0;
        if (document.SequenceNumber < maxSequence)
        {
            throw new BusinessException("Chỉ được xóa số hiệu mới nhất trong năm!");
        }

        documentRepository.Remove(document);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<byte[]> ExportExcelAsync(int? year, CancellationToken cancellationToken)
    {
        var documents = await documentRepository.GetForExportAsync(year, cancellationToken);
        if (documents.Count == 0)
        {
            throw new BusinessException("Không có dữ liệu để xuất Excel.");
        }

        string[] headers =
        [
            "STT", "Số hiệu VB", "Nội dung trích yếu", "Ngày ban hành",
            "Họ và tên", "Mã NV", "Phân xưởng", "Ghi chú", "Văn bản ban hành",
        ];

        using var workbook = new XLWorkbook();
        var usedSheetNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var group in documents.GroupBy(x => x.DocumentTemplate.Name))
        {
            var worksheet = workbook.Worksheets.Add(GetSafeSheetName(group.Key, usedSheetNames));

            for (var column = 0; column < headers.Length; column++)
            {
                worksheet.Cell(1, column + 1).Value = headers[column];
            }

            var headerRange = worksheet.Range(1, 1, 1, headers.Length);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(210, 230, 255);
            headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            var row = 2;
            foreach (var document in group)
            {
                worksheet.Cell(row, 1).Value = row - 1;
                worksheet.Cell(row, 2).Value = document.DocumentNumber;
                worksheet.Cell(row, 3).Value = document.Subject;
                worksheet.Cell(row, 4).Value = document.IssueDate.ToString("dd/MM/yyyy");
                worksheet.Cell(row, 5).Value = document.IssuerName;
                worksheet.Cell(row, 6).Value = document.IssuerEmpCode;
                worksheet.Cell(row, 7).Value = document.IssuerUnit;
                worksheet.Cell(row, 8).Value = document.Note;
                worksheet.Cell(row, 9).Value = PublishStatuses.GetLabel(document.PublishStatus);
                row++;
            }

            worksheet.Columns().AdjustToContents();
            var tableRange = worksheet.Range(1, 1, row - 1, headers.Length);
            tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    // ===== Nội bộ =====

    private sealed record NumberPlan(int SequenceNumber, int Year, string DocumentNumber, int? AcceptanceCount = null);

    /// <summary>Lấy thông tin người cấp + biểu mẫu, sinh số hiệu và lưu trong 1 transaction có khóa dòng.</summary>
    private async Task<IssueResultDto> IssueAsync(
        IssueDocumentRequestBase request,
        string? contractNumber,
        Func<DocumentTemplate, int, CancellationToken, Task<NumberPlan>> buildNumber,
        CancellationToken cancellationToken)
    {
        var template = await templateRepository.GetByIdAsync(request.DocumentTemplateId, cancellationToken)
            ?? throw new NotFoundException("Không tìm thấy biểu mẫu.");

        var (issuerName, issuerEmpCode, issuerUnit) = await GetIssuerAsync(cancellationToken);
        var now = DateTime.Now;

        var (document, plan) = await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var numberPlan = await buildNumber(template, now.Year, ct);
            var newDocument = new IssuedDocument
            {
                DocumentTemplateId = template.Id,
                SequenceNumber = numberPlan.SequenceNumber,
                Year = numberPlan.Year,
                DocumentNumber = numberPlan.DocumentNumber,
                IssuedAt = now,
                IssuerName = issuerName,
                IssuerEmpCode = issuerEmpCode,
                IssuerUnit = issuerUnit,
                Subject = request.Subject,
                ContractNumber = contractNumber,
                IssueDate = request.IssueDate,
                PublishStatus = PublishStatuses.Pending,
            };
            documentRepository.Add(newDocument);
            return (newDocument, numberPlan);
        }, cancellationToken);

        return new IssueResultDto
        {
            Id = document.Id,
            DocumentNumber = document.DocumentNumber,
            IssuedAt = document.IssuedAt,
            AcceptanceCount = plan.AcceptanceCount,
        };
    }

    private async Task<int> GetNextSequenceAsync(int templateId, int year, CancellationToken cancellationToken) =>
        (await documentRepository.GetMaxSequenceWithLockAsync(templateId, year, cancellationToken) ?? 0) + 1;

    /// <summary>Họ tên, mã NV theo tài khoản đăng nhập; phân xưởng = đơn vị cấp 1 trên sơ đồ tổ chức.</summary>
    private async Task<(string Name, string EmpCode, string Unit)> GetIssuerAsync(CancellationToken cancellationToken)
    {
        var empCode = currentUserService.UserName
            ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");

        var employee = await documentRepository.GetEmployeeByEmpCodeAsync(empCode, cancellationToken)
            ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");

        var unitName = await assignmentService.GetTopLevelUnitNameAsync(employee.Id, cancellationToken)
            ?? throw new BusinessException(
                "Bạn chưa được gán đơn vị trên sơ đồ tổ chức nên chưa lấy được số. Vui lòng liên hệ quản trị viên.");

        return (employee.FullName, employee.EmpCode, unitName);
    }

    /// <summary>Người lấy số được sửa văn bản của mình; sửa văn bản người khác cần quyền quản lý sổ.</summary>
    private async Task EnsureCanEditAsync(IssuedDocument document, CancellationToken cancellationToken)
    {
        if (string.Equals(document.IssuerEmpCode, currentUserService.UserName, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var userId = currentUserService.UserId
            ?? throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
        if (!await permissionChecker.HasPermissionAsync(userId, PermissionCodes.Documents.Manage, cancellationToken))
        {
            throw new ForbiddenException("Bạn chỉ được sửa văn bản do chính mình lấy số.");
        }
    }

    private static void NormalizeCommon(IssueDocumentRequestBase request) =>
        request.Subject = NullIfEmpty(request.Subject);

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Tên sheet Excel: bỏ ký tự cấm, tối đa 31 ký tự, không trùng.</summary>
    private static string GetSafeSheetName(string name, HashSet<string> usedNames)
    {
        var safeName = new string(name.Select(c => "/\\?*[]:".Contains(c) ? '_' : c).ToArray());
        safeName = safeName.Length > 31 ? safeName[..31] : safeName;

        var candidate = safeName;
        for (var index = 2; !usedNames.Add(candidate); index++)
        {
            var suffix = $" ({index})";
            candidate = (safeName.Length + suffix.Length > 31 ? safeName[..(31 - suffix.Length)] : safeName) + suffix;
        }

        return candidate;
    }
}
