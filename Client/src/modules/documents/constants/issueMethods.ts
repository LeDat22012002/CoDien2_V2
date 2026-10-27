import type { IssueMethod } from '@/modules/documents/types/documents';

/**
 * Cách đánh số theo biểu mẫu. Biểu mẫu chưa có trường loại số nên giữ cách nhận biết của hệ thống cũ:
 * theo Id biểu mẫu (script chuyển dữ liệu giữ nguyên Id). Biểu mẫu khác Id dưới đây là văn bản thường.
 */
const ISSUE_METHOD_BY_TEMPLATE_ID: Record<number, Exclude<IssueMethod, 'standard'>> = {
  22: 'acceptanceRecord',
  18: 'technicalConfirmation',
  19: 'technicalPlan',
  28: 'contractPayment',
};

export const getIssueMethod = (templateId: number): IssueMethod => ISSUE_METHOD_BY_TEMPLATE_ID[templateId] ?? 'standard';

/** Văn bản thường lấy số ngay trên thanh nhập; các loại khác mở phiếu điền thông tin. */
export const isStandardIssueMethod = (method: IssueMethod) => method === 'standard';

/** Hồ sơ nghiệm thu: tên viết tắt luôn kết thúc bằng đuôi này; để trống thì dùng mặc định. */
export const ACCEPTANCE_SHORT_NAME_SUFFIX = '-NM.CĐ2';
export const DEFAULT_ACCEPTANCE_SHORT_NAME = `BM${ACCEPTANCE_SHORT_NAME_SUFFIX}`;

/** Xác nhận kỹ thuật: tên nhà thầu luôn bắt đầu bằng tiền tố này. */
export const CONTRACTOR_PREFIX = 'HPDQ-';

export const ISSUED_DOCUMENT_PAGE_SIZE = 20;
