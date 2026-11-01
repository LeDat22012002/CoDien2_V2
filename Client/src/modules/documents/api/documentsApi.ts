import { axiosClient, httpDelete, httpGet, httpPost, httpPut } from '@/shared/api/axiosClient';
import type { PagedResult } from '@/shared/types/api';
import type {
  DocumentTemplate,
  DocumentTemplateFilter,
  DocumentTemplateRequest,
  IssueAcceptanceRecordRequest,
  IssueContractPaymentRequest,
  IssuedDocument,
  IssuedDocumentFilter,
  IssueResult,
  IssueStandardDocumentRequest,
  IssueTechnicalConfirmationRequest,
  IssueTechnicalPlanRequest,
  UpdateIssuedDocumentRequest,
} from '@/modules/documents/types/documents';

// ===== Biểu mẫu =====

/** Toàn bộ biểu mẫu cho ô chọn và tab lọc (công khai). */
export const getDocumentTemplateOptions = () => httpGet<DocumentTemplate[]>('/document-templates/options');

/** Danh sách biểu mẫu phân trang (quản lý), sắp theo tên. */
export const getDocumentTemplates = (filter: DocumentTemplateFilter) =>
  httpGet<PagedResult<DocumentTemplate>>('/document-templates', filter);

export const createDocumentTemplate = (request: DocumentTemplateRequest) =>
  httpPost<DocumentTemplate>('/document-templates', request);

export const updateDocumentTemplate = (id: number, request: DocumentTemplateRequest) =>
  httpPut<DocumentTemplate>(`/document-templates/${id}`, request);

/** Biểu mẫu đã dùng để cấp số thì Server từ chối xóa. */
export const deleteDocumentTemplate = (id: number) => httpDelete<null>(`/document-templates/${id}`);

// ===== Sổ văn bản đã cấp =====

/** Sổ văn bản đã cấp (công khai), mới nhất lên đầu. */
export const getIssuedDocuments = (filter: IssuedDocumentFilter) =>
  httpGet<PagedResult<IssuedDocument>>('/issued-documents', filter);

/** Sửa trích yếu, ghi chú, trạng thái, link eOffice. */
export const updateIssuedDocument = (id: number, request: UpdateIssuedDocumentRequest) =>
  httpPut<null>(`/issued-documents/${id}`, request);

/** Server chỉ cho xóa số mới nhất của biểu mẫu trong năm. */
export const deleteIssuedDocument = (id: number) => httpDelete<null>(`/issued-documents/${id}`);

/** File Excel theo cùng bộ lọc với danh sách (bỏ phân trang), mỗi biểu mẫu 1 sheet. */
export const exportIssuedDocuments = async (filter: Omit<IssuedDocumentFilter, 'pageIndex' | 'pageSize'>) =>
  (await axiosClient.get<Blob>('/issued-documents/export', { params: filter, responseType: 'blob' })).data;

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
