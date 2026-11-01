import { FileExcelOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { App, Button, DatePicker, Input, Select, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT, ISO_DATE_FORMAT, toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useAuthStore, useHasPermission } from '@/stores/authStore';
import { exportIssuedDocuments } from '@/modules/documents/api/documentsApi';
import { IssuedDocumentEditModal } from '@/modules/documents/components/IssuedDocumentEditModal';
import { IssuedDocumentManageTable } from '@/modules/documents/components/IssuedDocumentManageTable';
import {
  DOCUMENT_ADMIN_PAGE_SIZE,
  isPublishStatus,
  PUBLISH_STATUS_OPTIONS,
} from '@/modules/documents/constants/documentOptions';
import {
  useDeleteIssuedDocument,
  useDocumentTemplateOptions,
  useIssuedDocuments,
} from '@/modules/documents/hooks/useDocumentQueries';
import type { IssuedDocument, PublishStatus } from '@/modules/documents/types/documents';

const SEARCH_DEBOUNCE_MS = 500;

/** Tham số trên URL (?q=&template=&status=&from=&to=&page=&limit=) để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = {
  keyword: 'q',
  template: 'template',
  status: 'status',
  from: 'from',
  to: 'to',
  page: 'page',
  pageSize: 'limit',
} as const;

type ParamKey = keyof typeof PARAMS;

const toDayjs = (value?: string) => (value ? dayjs(value, ISO_DATE_FORMAT) : null);

/** Tải file Excel trình duyệt nhận được về máy. */
const saveFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Quản lý sổ văn bản đã cấp số (route /admin/issued-documents), dựng lại theo ManageBMDaLaySo hệ thống cũ:
 * lọc theo văn bản, người lấy / số hiệu, trạng thái, ngày ban hành; cập nhật trích yếu, trạng thái, link eOffice,
 * ghi chú; xóa số (Server chỉ cho xóa số mới nhất của văn bản trong năm); xuất Excel theo bộ lọc đang chọn.
 */
const IssuedDocumentManagementPage = () => {
  const { modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const templateId = Number(searchParams.get(PARAMS.template)) || undefined;
  const statusParam = searchParams.get(PARAMS.status);
  const publishStatus = isPublishStatus(statusParam) ? statusParam : undefined;
  const fromDate = searchParams.get(PARAMS.from) ?? undefined;
  const toDate = searchParams.get(PARAMS.to) ?? undefined;
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || DOCUMENT_ADMIN_PAGE_SIZE;

  const empCode = useAuthStore((state) => state.user?.empCode);
  const canManage = useHasPermission(PERMISSION_CODES.documents.manage);
  const canIssue = useHasPermission(PERMISSION_CODES.documents.issue);

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  // Đóng modal chỉ tắt cờ open, giữ dữ liệu dòng để nội dung không chớp trong lúc modal mờ dần
  const [editingDocument, setEditingDocument] = useState<IssuedDocument | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const filter = {
    keyword: keyword || undefined,
    documentTemplateId: templateId,
    publishStatus,
    fromDate,
    toDate,
  };
  const templatesQuery = useDocumentTemplateOptions();
  const documentsQuery = useIssuedDocuments({ ...filter, pageIndex, pageSize });
  const deleteMutation = useDeleteIssuedDocument();

  /** Ghi tham số lên URL; đổi bộ lọc thì về trang 1. */
  const updateParams = (patch: Partial<Record<ParamKey, string | number | undefined>>, resetPage = true) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === '') next.delete(param);
          else next.set(param, String(value));
        });
        if (resetPage) next.delete(PARAMS.page);
        return next;
      },
      { replace: true },
    );

  // Ô tìm kiếm → URL (sau 500ms ngừng gõ)
  useEffect(() => {
    if (debouncedKeyword !== keyword) updateParams({ keyword: debouncedKeyword });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedKeyword]);

  const handlePageChange = (nextPage: number, nextPageSize: number) =>
    updateParams(
      {
        page: nextPage === 1 ? undefined : nextPage,
        pageSize: nextPageSize === DOCUMENT_ADMIN_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

  const handleRangeChange = (range: [Dayjs | null, Dayjs | null] | null) =>
    updateParams({ from: toIsoDate(range?.[0]), to: toIsoDate(range?.[1]) });

  const handleReset = () => {
    setKeywordInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleExport = async () => {
    if (documentsQuery.data?.totalCount === 0) {
      notify.warning('Không có dữ liệu để xuất Excel.');
      return;
    }
    setIsExporting(true);
    try {
      saveFile(await exportIssuedDocuments(filter), `SoVanBanDaCap_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      notify.success('Xuất Excel thành công.');
    } catch (error) {
      notify.apiError(error);
    } finally {
      setIsExporting(false);
    }
  };

  const openEdit = (document: IssuedDocument) => {
    setEditingDocument(document);
    setIsEditOpen(true);
  };

  const confirmDelete = (document: IssuedDocument) =>
    modal.confirm({
      title: 'Xóa số văn bản?',
      content: `Số hiệu "${document.documentNumber}" của ${document.issuerName} sẽ bị xóa. Chỉ xóa được số mới nhất của văn bản trong năm.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(document.id);
          notify.success('Xóa số văn bản thành công.');
          // Xóa dòng cuối của trang cuối thì lùi 1 trang
          if (documentsQuery.data?.items.length === 1 && pageIndex > 1) updateParams({ page: pageIndex - 1 }, false);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  /** Quản lý sổ sửa mọi văn bản; người lấy số chỉ sửa văn bản của mình (Server kiểm tra lại). */
  const canEdit = (document: IssuedDocument) =>
    canManage || (canIssue && Boolean(empCode) && document.issuerEmpCode.toLowerCase() === empCode?.toLowerCase());

  const hasFilter = Boolean(keyword || templateId || publishStatus || fromDate || toDate);

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Sổ văn bản đã cấp"
        description="Toàn bộ số văn bản đã lấy: tra cứu, cập nhật trạng thái ban hành, link eOffice, ghi chú và xuất Excel."
        extra={
          <Button icon={<FileExcelOutlined />} onClick={handleExport} loading={isExporting}>
            Xuất Excel
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            allowClear
            aria-label="Tìm văn bản"
            prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
            placeholder="Tìm họ tên, mã NV, số hiệu, trích yếu…"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            aria-label="Lọc theo văn bản"
            placeholder="Tất cả văn bản"
            value={templateId}
            onChange={(value?: number) => updateParams({ template: value })}
            options={(templatesQuery.data ?? []).map((template) => ({ label: template.name, value: template.id }))}
            loading={templatesQuery.isLoading}
            className="w-full sm:w-72"
          />
          <Select
            allowClear
            aria-label="Lọc theo trạng thái"
            placeholder="Tất cả trạng thái"
            value={publishStatus}
            onChange={(value?: PublishStatus) => updateParams({ status: value })}
            options={PUBLISH_STATUS_OPTIONS}
            className="w-full sm:w-44"
          />
          <DatePicker.RangePicker
            aria-label="Lọc theo ngày ban hành"
            format={DATE_FORMAT}
            placeholder={['Từ ngày', 'Đến ngày']}
            value={[toDayjs(fromDate), toDayjs(toDate)]}
            onChange={(range) => handleRangeChange(range)}
            allowEmpty={[true, true]}
            className="w-full sm:w-64"
          />
          <div className="flex gap-2">
            {hasFilter && <Button onClick={handleReset}>Xóa lọc</Button>}
            <Tooltip title="Tải lại">
              <Button
                aria-label="Tải lại danh sách"
                icon={<ReloadOutlined />}
                onClick={() => documentsQuery.refetch()}
                loading={documentsQuery.isFetching}
              />
            </Tooltip>
          </div>
        </div>

        {documentsQuery.isError && !documentsQuery.data ? (
          <ErrorState error={documentsQuery.error} onRetry={() => documentsQuery.refetch()} />
        ) : (
          <IssuedDocumentManageTable
            documents={documentsQuery.data?.items ?? []}
            totalCount={documentsQuery.data?.totalCount ?? 0}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={documentsQuery.isFetching}
            canEdit={canEdit}
            canDelete={canManage}
            onPageChange={handlePageChange}
            onEdit={openEdit}
            onDelete={confirmDelete}
          />
        )}
      </div>

      <IssuedDocumentEditModal open={isEditOpen} document={editingDocument} onClose={() => setIsEditOpen(false)} />
    </div>
  );
};

export default IssuedDocumentManagementPage;
