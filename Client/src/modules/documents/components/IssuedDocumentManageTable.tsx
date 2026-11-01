import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Empty, Grid, Pagination, Table, Tag, Tooltip, Typography, type TableColumnsType } from 'antd';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { EMPTY_TEXT, formatDate } from '@/shared/utils/format';
import { DOCUMENT_ADMIN_PAGE_SIZE_OPTIONS, PUBLISH_STATUS_META } from '@/modules/documents/constants/documentOptions';
import type { IssuedDocument, PublishStatus } from '@/modules/documents/types/documents';

interface IssuedDocumentManageTableProps {
  documents: IssuedDocument[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  /** Được sửa dòng này không (quản lý sổ, hoặc người lấy số với văn bản của mình). */
  canEdit: (document: IssuedDocument) => boolean;
  canDelete: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (document: IssuedDocument) => void;
  onDelete: (document: IssuedDocument) => void;
}

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
 * Sổ văn bản đã cấp ở trang quản trị (cột như ManageBMDaLaySo hệ thống cũ), phân trang phía Server.
 * Khung cha phải cao cố định: thân bảng cuộn bên trong, tiêu đề cột và phân trang luôn nhìn thấy.
 */
export const IssuedDocumentManageTable = ({
  documents,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  canEdit,
  canDelete,
  onPageChange,
  onEdit,
  onDelete,
}: IssuedDocumentManageTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();

  const columns: TableColumnsType<IssuedDocument> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      fixed: 'left',
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: 'Số hiệu VB',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: COLUMN_WIDTH.longText,
      fixed: 'left',
      render: (documentNumber: string) => renderTruncated(documentNumber, 'font-medium'),
    },
    {
      title: 'Văn bản',
      dataIndex: 'templateName',
      key: 'templateName',
      width: COLUMN_WIDTH.text,
      render: (templateName: string) => renderTruncated(templateName),
    },
    {
      title: 'Nội dung trích yếu',
      dataIndex: 'subject',
      key: 'subject',
      width: COLUMN_WIDTH.longText,
      render: (subject?: string | null) => renderTruncated(subject),
    },
    {
      title: 'Ngày ban hành',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: COLUMN_WIDTH.date,
      align: 'center',
      render: (issueDate: string) => formatDate(issueDate),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'issuerName',
      key: 'issuerName',
      width: COLUMN_WIDTH.name,
      render: (issuerName: string) => renderTruncated(issuerName),
    },
    {
      title: 'Mã NV',
      dataIndex: 'issuerEmpCode',
      key: 'issuerEmpCode',
      width: COLUMN_WIDTH.code,
      align: 'center',
      render: (issuerEmpCode: string) => renderTruncated(issuerEmpCode, 'font-mono'),
    },
    {
      title: 'Phân xưởng',
      dataIndex: 'issuerUnit',
      key: 'issuerUnit',
      width: COLUMN_WIDTH.text,
      render: (issuerUnit: string) => renderTruncated(issuerUnit),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: COLUMN_WIDTH.text,
      render: (note?: string | null) => renderTruncated(note),
    },
    {
      title: 'Link eOffice',
      dataIndex: 'eOfficeLink',
      key: 'eOfficeLink',
      width: COLUMN_WIDTH.text,
      render: (link?: string | null) =>
        link ? (
          <Typography.Link
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            ellipsis
            className="block"
            title={link}
          >
            {link}
          </Typography.Link>
        ) : (
          <span className="italic text-text-secondary">Chưa cập nhật</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'publishStatus',
      key: 'publishStatus',
      width: COLUMN_WIDTH.tag,
      align: 'center',
      render: (status: PublishStatus) => {
        const meta = PUBLISH_STATUS_META[status];
        return meta ? (
          <Tag color={meta.color} className="me-0">
            {meta.label}
          </Tag>
        ) : (
          status
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: COLUMN_WIDTH.actions,
      align: 'center',
      fixed: 'right',
      render: (_, document) => (
        <div className="flex items-center justify-center gap-1">
          {canEdit(document) && (
            <Tooltip title="Cập nhật">
              <Button
                type="text"
                aria-label={`Cập nhật văn bản ${document.documentNumber}`}
                icon={<EditOutlined className="text-primary" />}
                onClick={() => onEdit(document)}
              />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Xóa số">
              <Button
                type="text"
                danger
                aria-label={`Xóa văn bản ${document.documentNumber}`}
                icon={<DeleteOutlined />}
                onClick={() => onDelete(document)}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<IssuedDocument>
          rowKey="id"
          size="middle"
          bordered
          loading={isLoading}
          columns={columns}
          dataSource={documents}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
          // Số đã hủy tô nền đỏ nhạt như hệ thống cũ
          rowClassName={(document) => (document.publishStatus === 'CANCELLED' ? 'bg-red-50' : '')}
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
        total={totalCount}
        showSizeChanger
        pageSizeOptions={DOCUMENT_ADMIN_PAGE_SIZE_OPTIONS}
        showTotal={(total, [from, to]) => `${from}–${to} / ${total} văn bản`}
        onChange={onPageChange}
      />
    </div>
  );
};
