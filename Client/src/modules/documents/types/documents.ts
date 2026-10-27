import type Slider from 'react-slick';
import type { PagedRequest } from '@/shared/types/api';

// ===== Biểu mẫu =====

export interface DocumentTemplateOption {
  id: number;
  code: string;
  name: string;
  numberSuffix: string;
  description?: string | null;
  startNumber?: number | null;
  process?: string | null;
}

// ===== Sổ văn bản đã cấp =====

export type PublishStatus = 'PENDING' | 'PUBLISHED' | 'CANCELLED';

export interface IssuedDocument {
  id: number;
  documentTemplateId: number;
  sequenceNumber: number;
  year: number;
  documentNumber: string;
  issuedAt: string;
  issuerName: string;
  issuerEmpCode: string;
  issuerUnit: string;
  subject?: string | null;
  contractNumber?: string | null;
  /** Ngày ban hành, dạng YYYY-MM-DD. */
  issueDate: string;
  note?: string | null;
  publishStatus: PublishStatus;
  eOfficeLink?: string | null;
  templateCode: string;
  templateName: string;
  numberSuffix: string;
}

export interface IssuedDocumentFilter extends PagedRequest {
  documentTemplateId?: number;
  issuerEmpCode?: string;
  fromDate?: string;
  toDate?: string;
  note?: string;
}

// ===== Cấp số =====

export interface IssueResult {
  id: number;
  documentNumber: string;
  issuedAt: string;
  acceptanceCount?: number | null;
}

/** Trường chung khi cấp số. Họ tên, mã NV, phân xưởng Server lấy theo tài khoản đăng nhập. */
interface IssueDocumentRequestBase {
  documentTemplateId: number;
  subject?: string;
  /** Ngày ban hành, dạng YYYY-MM-DD. */
  issueDate: string;
}

export type IssueStandardDocumentRequest = IssueDocumentRequestBase;

export interface IssueAcceptanceRecordRequest extends IssueDocumentRequestBase {
  contractNumber: string;
  shortName: string;
}

export interface IssueTechnicalConfirmationRequest extends IssueDocumentRequestBase {
  prNumber: string;
  contractor: string;
}

export interface IssueTechnicalPlanRequest extends IssueDocumentRequestBase {
  contractor: string;
}

export interface IssueContractPaymentRequest extends IssueDocumentRequestBase {
  contractNumber: string;
  isNew: boolean;
  /** Năm ký hợp đồng, chỉ gửi khi isNew = true. */
  year?: number;
}

/** Cách đánh số theo biểu mẫu (xem getIssueMethod ở constants/issueMethods). */
export type IssueMethod = 'standard' | 'acceptanceRecord' | 'technicalConfirmation' | 'technicalPlan' | 'contractPayment';

/** Mỗi cách đánh số gọi một API riêng (Server có 5 API cấp số). */
export type IssueDocumentPayload =
  | { method: 'standard'; request: IssueStandardDocumentRequest }
  | { method: 'acceptanceRecord'; request: IssueAcceptanceRecordRequest }
  | { method: 'technicalConfirmation'; request: IssueTechnicalConfirmationRequest }
  | { method: 'technicalPlan'; request: IssueTechnicalPlanRequest }
  | { method: 'contractPayment'; request: IssueContractPaymentRequest };

/** Instance react-slick của dãy tab biểu mẫu, để trang gọi slickGoTo qua ref. */
export type TemplateSliderInstance = Slider;

/** Biểu mẫu đang chọn trên ô "Văn bản": text là chữ đang hiện, id chỉ có khi đã chọn từ danh sách. */
export interface SelectedTemplate {
  id?: number;
  text: string;
}
