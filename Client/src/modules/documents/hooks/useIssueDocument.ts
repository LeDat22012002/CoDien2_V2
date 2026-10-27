import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  issueAcceptanceRecord,
  issueContractPayment,
  issueStandardDocument,
  issueTechnicalConfirmation,
  issueTechnicalPlan,
} from '@/modules/documents/api/documentsApi';
import { DOCUMENT_QUERY_KEYS } from '@/modules/documents/hooks/useDocumentQueries';
import type { IssueDocumentPayload, IssueResult } from '@/modules/documents/types/documents';

const issueDocument = (payload: IssueDocumentPayload): Promise<IssueResult> => {
  switch (payload.method) {
    case 'acceptanceRecord':
      return issueAcceptanceRecord(payload.request);
    case 'technicalConfirmation':
      return issueTechnicalConfirmation(payload.request);
    case 'technicalPlan':
      return issueTechnicalPlan(payload.request);
    case 'contractPayment':
      return issueContractPayment(payload.request);
    default:
      return issueStandardDocument(payload.request);
  }
};

export const useIssueDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: issueDocument,
    // Làm mới sổ văn bản và danh sách số hợp đồng (biên bản thanh toán) sau khi cấp số
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENT_QUERY_KEYS.issuedDocuments }),
  });
};
