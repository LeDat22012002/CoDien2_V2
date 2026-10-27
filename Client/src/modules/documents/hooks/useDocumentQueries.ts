import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getContractNumbers,
  getDocumentTemplateOptions,
  getIssuedDocuments,
} from '@/modules/documents/api/documentsApi';
import type { IssuedDocumentFilter } from '@/modules/documents/types/documents';

export const DOCUMENT_QUERY_KEYS = {
  templateOptions: ['document-templates', 'options'] as const,
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
