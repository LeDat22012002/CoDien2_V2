import { ReloadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Select, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PAGE_PARAM, Pagination } from '@/shared/components/Pagination';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT, ISO_DATE_FORMAT, toIsoDate } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { IssuedDocumentTable } from '@/modules/documents/components/IssuedDocumentTable';
import { ISSUED_DOCUMENT_PAGE_SIZE } from '@/modules/documents/constants/issueMethods';
import { useDocumentTemplateOptions, useIssuedDocuments } from '@/modules/documents/hooks/useDocumentQueries';

/** Bộ lọc trên URL (?template=&from=&to=&page=) để F5 / quay lại không mất. */
const PARAMS = { template: 'template', from: 'from', to: 'to' } as const;

const toDayjs = (value: string | null) => (value ? dayjs(value, ISO_DATE_FORMAT) : null);

/**
 * Văn bản tôi đã lấy (route /member/documents), như VanBanLaySo hệ thống cũ:
 * sổ văn bản của chính người đang đăng nhập, lọc theo biểu mẫu và ngày ban hành; chỉ xem.
 */
const MyDocumentsPage = () => {
  const empCode = useAuthStore((state) => state.user?.empCode ?? '');
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = Number(searchParams.get(PARAMS.template)) || undefined;
  const fromDate = searchParams.get(PARAMS.from) ?? undefined;
  const toDate = searchParams.get(PARAMS.to) ?? undefined;
  const pageIndex = Number(searchParams.get(PAGE_PARAM)) || 1;

  const templatesQuery = useDocumentTemplateOptions();
  const documentsQuery = useIssuedDocuments(
    {
      issuerEmpCode: empCode,
      documentTemplateId: templateId,
      fromDate,
      toDate,
      pageIndex,
      pageSize: ISSUED_DOCUMENT_PAGE_SIZE,
    },
    Boolean(empCode),
  );

  /** Đổi bộ lọc thì về trang 1. */
  const updateParams = (patch: Partial<Record<keyof typeof PARAMS, string | undefined>>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as keyof typeof PARAMS];
          if (value) next.set(param, value);
          else next.delete(param);
        });
        next.delete(PAGE_PARAM);
        return next;
      },
      { replace: true },
    );

  const handleRangeChange = (range: [Dayjs | null, Dayjs | null] | null) =>
    updateParams({ from: toIsoDate(range?.[0]), to: toIsoDate(range?.[1]) });

  return (
    <div className="flex flex-col">
      <PageHeader title="Văn bản tôi đã lấy" description="Các số văn bản bạn đã lấy, mới nhất trước." />

      <div className="flex flex-col gap-3 rounded-md bg-bg-container p-3 md:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            aria-label="Lọc theo biểu mẫu"
            placeholder="Tất cả biểu mẫu"
            value={templateId}
            onChange={(value?: number) => updateParams({ template: value ? String(value) : undefined })}
            options={(templatesQuery.data ?? []).map((template) => ({ label: template.name, value: template.id }))}
            loading={templatesQuery.isLoading}
            className="w-full sm:w-80"
          />
          <DatePicker.RangePicker
            aria-label="Lọc theo ngày ban hành"
            format={DATE_FORMAT}
            placeholder={['Từ ngày', 'Đến ngày']}
            value={[toDayjs(fromDate ?? null), toDayjs(toDate ?? null)]}
            onChange={(range) => handleRangeChange(range)}
            allowEmpty={[true, true]}
            className="w-full sm:w-72"
          />
          <Tooltip title="Tải lại">
            <Button
              aria-label="Tải lại danh sách"
              icon={<ReloadOutlined />}
              onClick={() => documentsQuery.refetch()}
              loading={documentsQuery.isFetching}
            />
          </Tooltip>
        </div>

        {documentsQuery.isError && !documentsQuery.data ? (
          <ErrorState error={documentsQuery.error} onRetry={() => documentsQuery.refetch()} />
        ) : (
          <>
            <IssuedDocumentTable
              documents={documentsQuery.data?.items ?? []}
              pageIndex={pageIndex}
              pageSize={ISSUED_DOCUMENT_PAGE_SIZE}
              isLoading={documentsQuery.isFetching}
            />
            <Pagination totalCount={documentsQuery.data?.totalCount ?? 0} pageSize={ISSUED_DOCUMENT_PAGE_SIZE} />
          </>
        )}
      </div>
    </div>
  );
};

export default MyDocumentsPage;
