import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Empty,
  Grid,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import dayjs from '@/shared/utils/dayjs';
import {
  DATE_FORMAT,
  EMPTY_TEXT,
  formatDateTimeSeconds,
  formatNumber,
  ISO_DATE_FORMAT,
  toIsoDate,
} from '@/shared/utils/format';
import { AuditLogDetailDrawer } from '@/modules/auditLogs/components/AuditLogDetailDrawer';
import { AuditLogStatusTag } from '@/modules/auditLogs/components/AuditLogStatusTag';
import {
  AUDIT_LOG_PAGE_SIZE,
  AUDIT_LOG_PAGE_SIZE_OPTIONS,
  AUDIT_LOG_RETENTION_DAYS,
  AUDIT_LOG_STATUS_OPTIONS,
  AUDIT_LOG_TYPE_COLORS,
  AUDIT_LOG_TYPE_LABELS,
  AUDIT_LOG_TYPE_OPTIONS,
  getAuditLogActionLabel,
  isAuditLogType,
} from '@/modules/auditLogs/constants/auditLogOptions';
import { useAuditLogs } from '@/modules/auditLogs/hooks/useAuditLogQueries';
import type { AuditLog, AuditLogType } from '@/modules/auditLogs/types/auditLogs';

const SEARCH_DEBOUNCE_MS = 500;

/** Tham số trên URL (?q=&type=&status=&from=&to=&page=&limit=) để F5 / quay lại không mất bộ lọc và trang. */
const PARAMS = {
  keyword: 'q',
  type: 'type',
  status: 'status',
  from: 'from',
  to: 'to',
  page: 'page',
  pageSize: 'limit',
} as const;

type ParamKey = keyof typeof PARAMS;

const toDayjs = (value?: string) => (value ? dayjs(value, ISO_DATE_FORMAT) : null);

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
 * Nhật ký hệ thống (route /admin/audit-logs, quyền audit-logs.view): ai đăng nhập, mở trang nào, thao tác
 * thêm/sửa/xóa gì và kết quả. Lọc theo người / nội dung, loại, kết quả, ngày; bấm 1 dòng xem chi tiết dữ liệu gửi lên.
 */
const AuditLogListPage = () => {
  const screens = Grid.useBreakpoint();
  const { containerRef, scrollY } = useTableScrollY();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get(PARAMS.keyword) ?? '';
  const typeParam = searchParams.get(PARAMS.type);
  const type = isAuditLogType(typeParam) ? typeParam : undefined;
  const statusParam = searchParams.get(PARAMS.status);
  const status = statusParam === 'success' || statusParam === 'failed' ? statusParam : undefined;
  const fromDate = searchParams.get(PARAMS.from) ?? undefined;
  const toDate = searchParams.get(PARAMS.to) ?? undefined;
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize = Number(searchParams.get(PARAMS.pageSize)) || AUDIT_LOG_PAGE_SIZE;

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  // Đóng Drawer chỉ tắt cờ open, giữ dòng đang xem để nội dung không chớp
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const logsQuery = useAuditLogs({
    keyword: keyword || undefined,
    type,
    isSuccess: status === undefined ? undefined : status === 'success',
    fromDate,
    toDate,
    pageIndex,
    pageSize,
  });

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
        pageSize: nextPageSize === AUDIT_LOG_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

  const handleRangeChange = (range: [Dayjs | null, Dayjs | null] | null) =>
    updateParams({ from: toIsoDate(range?.[0]), to: toIsoDate(range?.[1]) });

  const handleReset = () => {
    setKeywordInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const openDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const hasFilter = Boolean(keyword || type || status || fromDate || toDate);

  const columns: TableColumnsType<AuditLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: COLUMN_WIDTH.dateTimeSeconds,
      align: 'center',
      render: (createdAt: string) => formatDateTimeSeconds(createdAt),
    },
    {
      title: 'Người dùng',
      key: 'user',
      width: COLUMN_WIDTH.name,
      render: (_, log) =>
        renderTruncated(log.fullName ? `${log.fullName} (${log.empCode})` : log.empCode, 'font-medium'),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: COLUMN_WIDTH.tag,
      align: 'center',
      render: (logType: AuditLogType) => (
        <Tag color={AUDIT_LOG_TYPE_COLORS[logType]}>{AUDIT_LOG_TYPE_LABELS[logType]}</Tag>
      ),
    },
    {
      title: 'Nội dung',
      key: 'action',
      width: COLUMN_WIDTH.longText,
      render: (_, log) => renderTruncated(getAuditLogActionLabel(log)),
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'path',
      key: 'path',
      width: COLUMN_WIDTH.longText,
      responsive: ['lg'],
      render: (_, log) => renderTruncated(log.method ? `${log.method} ${log.path}` : log.path, 'font-mono'),
    },
    {
      title: 'Kết quả',
      key: 'status',
      width: COLUMN_WIDTH.status,
      align: 'center',
      render: (_, log) => <AuditLogStatusTag log={log} />,
    },
    {
      title: 'Thông báo',
      dataIndex: 'message',
      key: 'message',
      width: COLUMN_WIDTH.longText,
      responsive: ['md'],
      render: (message?: string | null) => renderTruncated(message),
    },
    {
      title: 'IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: COLUMN_WIDTH.phone,
      responsive: ['xl'],
      render: (ipAddress?: string | null) => renderTruncated(ipAddress, 'font-mono'),
    },
    {
      title: 'Xử lý',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: COLUMN_WIDTH.short,
      align: 'right',
      responsive: ['xl'],
      render: (durationMs?: number | null) =>
        durationMs === null || durationMs === undefined ? '' : `${formatNumber(durationMs)} ms`,
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      width: COLUMN_WIDTH.short,
      align: 'center',
      fixed: 'right',
      render: (_, log) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            aria-label="Xem chi tiết nhật ký"
            icon={<EyeOutlined className="text-primary" />}
            onClick={(event) => {
              event.stopPropagation();
              openDetail(log);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Nhật ký hệ thống"
        description={`Đăng nhập, truy cập trang và thao tác thêm / sửa / xóa của người dùng. Tự xóa sau ${AUDIT_LOG_RETENTION_DAYS} ngày.`}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            allowClear
            aria-label="Tìm nhật ký"
            prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
            placeholder="Tìm mã NV, họ tên, đường dẫn, trang, thông báo…"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="w-full sm:w-80"
          />
          <Select
            allowClear
            aria-label="Lọc theo loại"
            placeholder="Tất cả loại"
            value={type}
            onChange={(value?: AuditLogType) => updateParams({ type: value })}
            options={AUDIT_LOG_TYPE_OPTIONS}
            className="w-full sm:w-44"
          />
          <Select
            allowClear
            aria-label="Lọc theo kết quả"
            placeholder="Tất cả kết quả"
            value={status}
            onChange={(value?: string) => updateParams({ status: value })}
            options={AUDIT_LOG_STATUS_OPTIONS}
            className="w-full sm:w-40"
          />
          <DatePicker.RangePicker
            aria-label="Lọc theo ngày"
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
                onClick={() => logsQuery.refetch()}
                loading={logsQuery.isFetching}
              />
            </Tooltip>
          </div>
        </div>

        {logsQuery.isError && !logsQuery.data ? (
          <ErrorState error={logsQuery.error} onRetry={() => logsQuery.refetch()} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
              <Table<AuditLog>
                rowKey="id"
                size="middle"
                bordered
                loading={logsQuery.isFetching}
                columns={columns}
                dataSource={logsQuery.data?.items ?? []}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
                className="[&_.ant-table-cell]:whitespace-nowrap"
                rowClassName={(log) => (log.isSuccess ? 'cursor-pointer' : 'cursor-pointer [&>td]:bg-red-50')}
                onRow={(log) => ({ onClick: () => openDetail(log) })}
                locale={{
                  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có nhật ký nào phù hợp" />,
                }}
              />
            </div>
            <Pagination
              align="end"
              current={pageIndex}
              pageSize={pageSize}
              total={logsQuery.data?.totalCount ?? 0}
              showSizeChanger
              pageSizeOptions={AUDIT_LOG_PAGE_SIZE_OPTIONS}
              showTotal={(total, [from, to]) => `${from}–${to} / ${formatNumber(total)} dòng`}
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <AuditLogDetailDrawer open={isDetailOpen} log={selectedLog} onClose={() => setIsDetailOpen(false)} />
    </div>
  );
};

export default AuditLogListPage;
