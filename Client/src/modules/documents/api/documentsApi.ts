import { httpGet, httpPost } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  DocumentTemplateOption,
  IssueAcceptanceRecordRequest,
  IssueContractPaymentRequest,
  IssuedDocument,
  IssuedDocumentFilter,
  IssueResult,
  IssueStandardDocumentRequest,
  IssueTechnicalConfirmationRequest,
  IssueTechnicalPlanRequest,
} from '@/modules/documents/types/documents';

// ===== Biểu mẫu =====

/** Toàn bộ biểu mẫu cho ô chọn và tab lọc (công khai). */
export const getDocumentTemplateOptions = () => httpGet<DocumentTemplateOption[]>('/document-templates/options');

// ===== Sổ văn bản đã cấp =====

/** Sổ văn bản đã cấp (công khai), mới nhất lên đầu. */
export const getIssuedDocuments = (filter: IssuedDocumentFilter) =>
  httpGet<PagedResult<IssuedDocument>>('/issued-documents', filter);

/** Các số hợp đồng đã cấp của 1 biểu mẫu (biên bản thanh toán theo hợp đồng). */
export const getContractNumbers = (documentTemplateId: number) =>
  httpGet<string[]>('/issued-documents/contract-numbers', { documentTemplateId });

// ===== Cấp số =====

/** Văn bản thường: {STT}/{Năm}/{Đuôi số}. */
export const issueStandardDocument = (request: IssueStandardDocumentRequest) =>
  httpPost<IssueResult>('/issued-documents', request);

/** Hồ sơ nghiệm thu: {Lần NT}/{Số HĐ}/{Tên viết tắt}. */
export const issueAcceptanceRecord = (request: IssueAcceptanceRecordRequest) =>
  httpPost<IssueResult>('/issued-documents/acceptance-records', request);

/** Xác nhận kỹ thuật: XNKT.{STT}-{Năm}/{Số PR}/{Nhà thầu}. */
export const issueTechnicalConfirmation = (request: IssueTechnicalConfirmationRequest) =>
  httpPost<IssueResult>('/issued-documents/technical-confirmations', request);

/** Phương án kỹ thuật: {STT}/{Năm}/PAKT-NM.CĐ2-{Nhà thầu}. */
export const issueTechnicalPlan = (request: IssueTechnicalPlanRequest) =>
  httpPost<IssueResult>('/issued-documents/technical-plans', request);

/** Biên bản xác nhận khối lượng thanh toán công đoạn: {STT}/{Số HĐ}/{Năm HĐ}/{Đuôi số}. */
export const issueContractPayment = (request: IssueContractPaymentRequest) =>
  httpPost<IssueResult>('/issued-documents/contract-payments', request);
