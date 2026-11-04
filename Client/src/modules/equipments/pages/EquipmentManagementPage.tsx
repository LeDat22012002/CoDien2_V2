import {
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
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
import { EquipmentFormModal } from '@/modules/equipments/components/EquipmentFormModal';
import { EquipmentImportModal } from '@/modules/equipments/components/EquipmentImportModal';
import { useDeleteEquipment, useEquipments } from '@/modules/equipments/hooks/useEquipmentQueries';
import type { Equipment } from '@/modules/equipments/types/equipments';

const SEARCH_DEBOUNCE_MS = 500;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
 * Danh mục thiết bị (route /admin/equipments): tìm theo mã / tên, thêm, sửa, xóa, import Excel.
 * Thiết bị đã có báo cáo sự cố thì Server không cho xóa.
 * Trang yêu cầu quyền equipments.manage nên không ẩn nút theo quyền.
 */
const EquipmentManagementPage = () => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { containerRef, scrollY } = useTableScrollY();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || DEFAULT_PAGE_SIZE;

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  // Đóng modal chỉ tắt cờ open, giữ dữ liệu dòng để nội dung không chớp trong lúc modal mờ dần
  const [editingEquipment, setEditingEquipment] = useState<Equipment>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const equipmentsQuery = useEquipments({ keyword: keyword || undefined, pageIndex, pageSize });
  const deleteMutation = useDeleteEquipment();

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
        pageSize: nextPageSize === DEFAULT_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

  const openForm = (equipment?: Equipment) => {
    setEditingEquipment(equipment);
    setIsFormOpen(true);
  };

  const confirmDelete = (equipment: Equipment) =>
    modal.confirm({
      title: 'Xóa thiết bị?',
      content: `"${equipment.code}" sẽ bị xóa khỏi danh mục. Thiết bị đã có báo cáo sự cố thì không xóa được.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(equipment.id);
          notify.success('Xóa thiết bị thành công.');
          // Xóa dòng cuối của trang cuối thì lùi 1 trang
          if (equipmentsQuery.data?.items.length === 1 && pageIndex > 1) updateParams({ page: pageIndex - 1 }, false);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const columns: TableColumnsType<Equipment> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: 'Mã Equipment',
      dataIndex: 'code',
      key: 'code',
      width: COLUMN_WIDTH.name,
      render: (code: string) => renderTruncated(code, 'font-mono font-medium'),
    },
    {
      title: 'Tên thiết bị',
      dataIndex: 'name',
      key: 'name',
      width: COLUMN_WIDTH.paragraph,
      render: (name?: string | null) => renderTruncated(name),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: COLUMN_WIDTH.actions,
      align: 'center',
      fixed: 'right',
      render: (_, equipment) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Sửa">
            <Button
              type="text"
              aria-label={`Sửa thiết bị ${equipment.code}`}
              icon={<EditOutlined className="text-primary" />}
              onClick={() => openForm(equipment)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              aria-label={`Xóa thiết bị ${equipment.code}`}
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(equipment)}
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
        title="Danh mục thiết bị"
        description="Mã và tên thiết bị (Equipment) để chọn khi báo cáo sự cố."
        extra={
          <div className="flex gap-2">
            <Button icon={<FileExcelOutlined />} onClick={() => setIsImportOpen(true)}>
              Import Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
              Thêm thiết bị
            </Button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 flex gap-2">
          <Input
            allowClear
            aria-label="Tìm thiết bị"
            prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
            placeholder="Tìm mã hoặc tên thiết bị…"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="min-w-0 flex-1 sm:max-w-80"
          />
          <Tooltip title="Tải lại">
            <Button
              aria-label="Tải lại danh sách"
              icon={<ReloadOutlined />}
              onClick={() => equipmentsQuery.refetch()}
              loading={equipmentsQuery.isFetching}
            />
          </Tooltip>
        </div>

        {equipmentsQuery.isError && !equipmentsQuery.data ? (
          <ErrorState error={equipmentsQuery.error} onRetry={() => equipmentsQuery.refetch()} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
              <Table<Equipment>
                rowKey="id"
                size="middle"
                bordered
                loading={equipmentsQuery.isFetching}
                columns={columns}
                dataSource={equipmentsQuery.data?.items ?? []}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
                className="[&_.ant-table-cell]:whitespace-nowrap"
                locale={{
                  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có thiết bị nào phù hợp" />,
                }}
              />
            </div>
            <Pagination
              align="end"
              current={pageIndex}
              pageSize={pageSize}
              total={equipmentsQuery.data?.totalCount ?? 0}
              showSizeChanger
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              showTotal={(total, [from, to]) => `${from}–${to} / ${total} thiết bị`}
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <EquipmentFormModal open={isFormOpen} equipment={editingEquipment} onClose={() => setIsFormOpen(false)} />
      <EquipmentImportModal open={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
};

export default EquipmentManagementPage;
