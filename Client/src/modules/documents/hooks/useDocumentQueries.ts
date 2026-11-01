import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  deleteIssuedDocument,
  getContractNumbers,
  getDocumentTemplateOptions,
  getDocumentTemplates,
  getIssuedDocuments,
  updateDocumentTemplate,
  updateIssuedDocument,
} from '@/modules/documents/api/documentsApi';
import type {
  DocumentTemplateFilter,
  DocumentTemplateRequest,
  IssuedDocumentFilter,
  UpdateIssuedDocumentRequest,
} from '@/modules/documents/types/documents';

export const DOCUMENT_QUERY_KEYS = {
  templates: ['document-templates'] as const,
  templateOptions: ['document-templates', 'options'] as const,
  templateList: (filter: DocumentTemplateFilter) => ['document-templates', 'list', filter] as const,
  issuedDocuments: ['issued-documents'] as const,
  issuedDocumentList: (filter: IssuedDocumentFilter) => ['issued-documents', 'list', filter] as const,
  contractNumbers: (templateId: number) => ['issued-documents', 'contract-numbers', templateId] as const,
};

export const useDocumentTemplateOptions = () =>
  useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.templateOptions,
    queryFn: getDocumentTemplateOptions,
    staleTime: 5 * 60_000,
  });

export const useDocumentTemplates = (filter: DocumentTemplateFilter) =>
  useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.templateList(filter),
    queryFn: () => getDocumentTemplates(filter),
    placeholderData: keepPreviousData,
  });

/** Đổi trang / tab vẫn giữ dữ liệu cũ trong lúc tải để bảng không nháy rỗng. */
export const useIssuedDocuments = (filter: IssuedDocumentFilter, isEnabled = true) =>
  useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.issuedDocumentList(filter),
    queryFn: () => getIssuedDocuments(filter),
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  });

export const useContractNumbers = (templateId: number, isEnabled: boolean) =>
  useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.contractNumbers(templateId),
    queryFn: () => getContractNumbers(templateId),
    enabled: isEnabled,
  });

// ----- Ghi biểu mẫu: làm mới danh sách quản lý và ô chọn biểu mẫu (cùng gốc ['document-templates']) -----

const useInvalidateTemplates = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.templates });
};

export const useCreateDocumentTemplate = () => {
  const invalidate = useInvalidateTemplates();
  return useMutation({ mutationFn: createDocumentTemplate, onSuccess: invalidate });
};

export const useUpdateDocumentTemplate = () => {
  const invalidate = useInvalidateTemplates();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: DocumentTemplateRequest }) =>
      updateDocumentTemplate(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteDocumentTemplate = () => {
  const invalidate = useInvalidateTemplates();
  return useMutation({ mutationFn: deleteDocumentTemplate, onSuccess: invalidate });
};

// ----- Ghi sổ văn bản -----

const useInvalidateIssuedDocuments = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.issuedDocuments });
};

export const useUpdateIssuedDocument = () => {
  const invalidate = useInvalidateIssuedDocuments();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateIssuedDocumentRequest }) =>
      updateIssuedDocument(id, request),
    onSuccess: invalidate,
  });
};

export const useDeleteIssuedDocument = () => {
  const invalidate = useInvalidateIssuedDocuments();
  return useMutation({ mutationFn: deleteIssuedDocument, onSuccess: invalidate });
};
