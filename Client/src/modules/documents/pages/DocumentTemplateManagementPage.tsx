import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Empty,
  Grid,
  Input,
  Pagination,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { EMPTY_TEXT } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { DocumentTemplateFormModal } from '@/modules/documents/components/DocumentTemplateFormModal';
import {
  DOCUMENT_ADMIN_PAGE_SIZE,
  DOCUMENT_ADMIN_PAGE_SIZE_OPTIONS,
} from '@/modules/documents/constants/documentOptions';
import { useDeleteDocumentTemplate, useDocumentTemplates } from '@/modules/documents/hooks/useDocumentQueries';
import type { DocumentTemplate } from '@/modules/documents/types/documents';

const SEARCH_DEBOUNCE_MS = 500;

/** Tham số trên URL (?q=&page=&limit=) để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = { keyword: 'q', page: 'page', pageSize: 'limit' } as const;

type ParamKey = keyof typeof PARAMS;

/** Ô 1 dòng: chữ dài cắt "…", hover hiện đầy đủ. */
const renderTruncated = (value: string | null | undefined, className = '') =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: { title: value, placement: 'topLeft' } }} className={`block ${className}`}>
      {value}
    </Typography.Text>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

/**
 * Danh sách văn bản cần lấy số (route /admin/document-templates), dựng lại theo ManageBieuMau hệ thống cũ:
 * tìm theo tên / mã, thêm, sửa, xóa (văn bản đã được lấy số thì Server không cho xóa).
 * Trang yêu cầu quyền document-templates.manage nên không ẩn nút theo quyền.
 */
const DocumentTemplateManagementPage = () => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { containerRef, scrollY } = useTableScrollY();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || DOCUMENT_ADMIN_PAGE_SIZE;

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  // Đóng modal chỉ tắt cờ open, giữ dữ liệu dòng để nội dung không chớp trong lúc modal mờ dần
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const templatesQuery = useDocumentTemplates({ keyword: keyword || undefined, pageIndex, pageSize });
  const deleteMutation = useDeleteDocumentTemplate();

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

  const openForm = (template?: DocumentTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const confirmDelete = (template: DocumentTemplate) =>
    modal.confirm({
      title: 'Xóa văn bản?',
      content: `"${template.name}" sẽ bị xóa khỏi danh sách lấy số. Văn bản đã có người lấy số thì không xóa được.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(template.id);
          notify.success('Xóa văn bản thành công.');
          // Xóa dòng cuối của trang cuối thì lùi 1 trang
          if (templatesQuery.data?.items.length === 1 && pageIndex > 1) updateParams({ page: pageIndex - 1 }, false);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const columns: TableColumnsType<DocumentTemplate> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: 'Tên văn bản',
      dataIndex: 'name',
      key: 'name',
      width: COLUMN_WIDTH.longText,
      render: (name: string) => renderTruncated(name, 'font-medium'),
    },
    {
      title: 'Mã văn bản',
      dataIndex: 'code',
      key: 'code',
      width: COLUMN_WIDTH.select,
      render: (code: string) => renderTruncated(code, 'font-mono'),
    },
    {
      title: 'Số hiệu văn bản',
      dataIndex: 'numberSuffix',
      key: 'numberSuffix',
      width: COLUMN_WIDTH.text,
      render: (numberSuffix: string) => renderTruncated(numberSuffix, 'font-mono'),
    },
    {
      title: 'Số bắt đầu',
      dataIndex: 'startNumber',
      key: 'startNumber',
      width: COLUMN_WIDTH.short,
      align: 'center',
      render: (startNumber?: number | null) => startNumber ?? EMPTY_TEXT,
    },
    {
      title: 'Quy trình',
      dataIndex: 'process',
      key: 'process',
      width: COLUMN_WIDTH.tag,
      responsive: ['lg'],
      render: (process?: string | null) => renderTruncated(process),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: COLUMN_WIDTH.longText,
      responsive: ['xl'],
      render: (description?: string | null) => renderTruncated(description),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: COLUMN_WIDTH.actions,
      align: 'center',
      fixed: 'right',
      render: (_, template) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Sửa">
            <Button
              type="text"
              aria-label={`Sửa văn bản ${template.name}`}
              icon={<EditOutlined className="text-primary" />}
              onClick={() => openForm(template)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              aria-label={`Xóa văn bản ${template.name}`}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(template)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Danh sách văn bản"
        description="Các văn bản cần lấy số ở trang Lấy số văn bản: tên, mã, đuôi số hiệu."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
            Thêm văn bản
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 flex gap-2">
          <Input
            allowClear
            aria-label="Tìm văn bản"
            prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
            placeholder="Tìm tên hoặc mã văn bản…"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="min-w-0 flex-1 sm:max-w-80"
          />
          <Tooltip title="Tải lại">
            <Button
              aria-label="Tải lại danh sách"
              icon={<ReloadOutlined />}
              onClick={() => templatesQuery.refetch()}
              loading={templatesQuery.isFetching}
            />
          </Tooltip>
        </div>

        {templatesQuery.isError && !templatesQuery.data ? (
          <ErrorState error={templatesQuery.error} onRetry={() => templatesQuery.refetch()} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
              <Table<DocumentTemplate>
                rowKey="id"
                size="middle"
                bordered
                loading={templatesQuery.isFetching}
                columns={columns}
                dataSource={templatesQuery.data?.items ?? []}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
                className="[&_.ant-table-cell]:whitespace-nowrap"
                locale={{
                  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có văn bản nào phù hợp" />,
                }}
              />
            </div>
            <Pagination
              align="end"
              current={pageIndex}
              pageSize={pageSize}
              total={templatesQuery.data?.totalCount ?? 0}
              showSizeChanger
              pageSizeOptions={DOCUMENT_ADMIN_PAGE_SIZE_OPTIONS}
              showTotal={(total, [from, to]) => `${from}–${to} / ${total} văn bản`}
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <DocumentTemplateFormModal open={isFormOpen} template={editingTemplate} onClose={() => setIsFormOpen(false)} />
    </div>
  );
};

export default DocumentTemplateManagementPage;
