import { Empty, Table, type TableProps } from 'antd';
import { formatDate } from '@/shared/utils/format';
import type { IssuedDocument } from '@/modules/documents/types/documents';

interface IssuedDocumentTableProps {
  documents: IssuedDocument[];
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
}

/** Cột giống bảng hệ thống cũ. */
const buildColumns = (pageIndex: number, pageSize: number): TableProps<IssuedDocument>['columns'] => [
  {
    title: 'STT',
    key: 'index',
    width: 60,
    fixed: 'left',
    align: 'center',
    render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
  },
  { title: 'Số hiệu VB', dataIndex: 'documentNumber', key: 'documentNumber', align: 'center', width: 250 },
  { title: 'Nội dung trích yếu', dataIndex: 'subject', key: 'subject', width: 200, ellipsis: true },
  {
    title: 'Ngày lấy số',
    dataIndex: 'issueDate',
    key: 'issueDate',
    align: 'center',
    width: 120,
    render: (issueDate: string) => formatDate(issueDate),
  },
  { title: 'Họ và tên', dataIndex: 'issuerName', key: 'issuerName', align: 'center', width: 150 },
  { title: 'Mã NV', dataIndex: 'issuerEmpCode', key: 'issuerEmpCode', align: 'center', width: 120 },
  { title: 'Phân xưởng', dataIndex: 'issuerUnit', key: 'issuerUnit', align: 'center', width: 160 },
];

/** Sổ văn bản đã cấp; số đã hủy tô nền đỏ nhạt như hệ thống cũ. Phân trang đặt bên dưới (Pagination). */
export const IssuedDocumentTable = ({ documents, pageIndex, pageSize, isLoading }: IssuedDocumentTableProps) => (
  <Table<IssuedDocument>
    rowKey="id"
    dataSource={documents}
    columns={buildColumns(pageIndex, pageSize)}
    loading={isLoading}
    bordered
    pagination={false}
    size="small"
    scroll={{ x: 1200, y: 720 }}
    rowClassName={(record) => (record.publishStatus === 'CANCELLED' ? 'bg-red-50' : '')}
    locale={{
      emptyText: (
        <div className="flex h-[100px] w-full items-center justify-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu !" />
        </div>
      ),
    }}
  />
);
