import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import {
  useSaveWorkCategory,
  useSetWorkCategoryActive,
  useWorkCategories,
} from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkCategory, WorkCategoryRequest } from '@/modules/workReports/types/workReports';

interface WorkshopOption {
  value: number;
  label: string;
}

interface CategoryPanelProps {
  workshops: WorkshopOption[];
}

interface CategoryFormValues {
  groupLetter: string;
  name: string;
  code: string;
  codeSuffix: string;
  sortOrder?: number | null;
  showInSummary: boolean;
  workshopIds: number[];
}

/**
 * Đầu mục công việc (nhóm A–I): dùng chung toàn nhà máy, có thể giới hạn xưởng áp dụng.
 * Đã có dữ liệu thì chỉ ngừng dùng, không xóa; đổi hậu tố không đổi mã đã sinh.
 */
export const CategoryPanel = ({ workshops }: CategoryPanelProps) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const [editing, setEditing] = useState<WorkCategory>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const categoriesQuery = useWorkCategories(true);
  const saveMutation = useSaveWorkCategory();
  const activeMutation = useSetWorkCategoryActive();
  const workshopName = new Map(workshops.map((workshop) => [workshop.value, workshop.label]));

  const openForm = (category?: WorkCategory) => {
    setEditing(category);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    let values: CategoryFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const request: WorkCategoryRequest = {
      groupLetter: values.groupLetter.trim().toUpperCase(),
      name: values.name.trim(),
      code: values.code.trim(),
      codeSuffix: values.codeSuffix.trim().toUpperCase(),
      sortOrder: values.sortOrder ?? undefined,
      showInSummary: values.showInSummary,
      workshopIds: values.workshopIds ?? [],
    };

    try {
      await saveMutation.mutateAsync({ id: editing?.id, request });
      notify.success(editing ? 'Đã lưu đầu mục.' : 'Đã thêm đầu mục.');
      setIsFormOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  const toggleActive = async (category: WorkCategory, isActive: boolean) => {
    try {
      await activeMutation.mutateAsync({ id: category.id, isActive });
      notify.success(isActive ? `Đã dùng lại "${category.code}".` : `Đã ngừng dùng "${category.code}".`);
    } catch (error) {
      notify.apiError(error);
    }
  };

  if (categoriesQuery.isError && !categoriesQuery.data) {
    return <ErrorState error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} />;
  }

  const columns: TableColumnsType<WorkCategory> = [
    { title: 'Nhóm', dataIndex: 'groupLetter', key: 'groupLetter', width: COLUMN_WIDTH.short, align: 'center' },
    { title: 'Tên đầu mục', dataIndex: 'name', key: 'name', width: COLUMN_WIDTH.text },
    { title: 'Giá trị dropdown', dataIndex: 'code', key: 'code', width: COLUMN_WIDTH.tag },
    {
      title: 'Hậu tố mã',
      dataIndex: 'codeSuffix',
      key: 'codeSuffix',
      width: COLUMN_WIDTH.code,
      render: (value: string) => <span className="font-mono">{value}</span>,
    },
    { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: COLUMN_WIDTH.short, align: 'right' },
    {
      title: 'Tổng hợp',
      dataIndex: 'showInSummary',
      key: 'showInSummary',
      width: COLUMN_WIDTH.short,
      align: 'center',
      render: (value: boolean) => (value ? 'Có' : 'Không'),
    },
    {
      title: 'Xưởng áp dụng',
      dataIndex: 'workshopIds',
      key: 'workshopIds',
      width: COLUMN_WIDTH.longText,
      render: (ids: number[]) =>
        ids.length === 0 ? (
          <Typography.Text type="secondary">Mọi xưởng</Typography.Text>
        ) : (
          <Typography.Text ellipsis={{ tooltip: true }}>
            {ids.map((id) => workshopName.get(id) ?? `#${id}`).join(', ')}
          </Typography.Text>
        ),
    },
    {
      title: 'Đang dùng',
      dataIndex: 'isActive',
      key: 'isActive',
      width: COLUMN_WIDTH.tag,
      render: (value: boolean, category) => (
        <Switch
          checked={value}
          checkedChildren="Dùng"
          unCheckedChildren="Ngừng"
          loading={activeMutation.isPending && activeMutation.variables?.id === category.id}
          onChange={(checked) => toggleActive(category, checked)}
          aria-label={`Bật / ngừng đầu mục ${category.code}`}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, category) => (
        <Tooltip title="Sửa">
          <Button
            type="text"
            aria-label={`Sửa đầu mục ${category.code}`}
            icon={<EditOutlined className="text-primary" />}
            onClick={() => openForm(category)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Text type="secondary">
          Thứ tự nhóm trên bảng công việc và cột trên Tổng hợp theo cột “Thứ tự”. Mã công việc = Tiền tố tổ-
          <Tag className="mx-1">Hậu tố</Tag>-STT.
        </Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
          Thêm đầu mục
        </Button>
      </div>
      <Table<WorkCategory>
        rowKey="id"
        size="middle"
        bordered
        loading={categoriesQuery.isFetching}
        columns={columns}
        dataSource={categoriesQuery.data ?? []}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
        className="[&_.ant-table-cell]:whitespace-nowrap"
        rowClassName={(category) => (category.isActive ? '' : 'opacity-60')}
      />

      <Modal
        open={isFormOpen}
        title={editing ? `Sửa đầu mục ${editing.code}` : 'Thêm đầu mục công việc'}
        okText={editing ? 'Lưu thay đổi' : 'Thêm đầu mục'}
        cancelText="Hủy"
        onOk={handleSubmit}
        onCancel={() => setIsFormOpen(false)}
        confirmLoading={saveMutation.isPending}
        mask={{ closable: false }}
        width={{ xs: '94%', md: 640 }}
        centered
        destroyOnHidden
      >
        <Form<CategoryFormValues>
          form={form}
          layout="vertical"
          preserve={false}
          className="pt-1"
          initialValues={
            editing
              ? { ...editing, sortOrder: editing.sortOrder }
              : { showInSummary: true, workshopIds: [] }
          }
        >
          <Row gutter={12}>
            <Col xs={8} md={6}>
              <Form.Item
                name="groupLetter"
                label="Nhóm"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập nhóm' },
                  { max: 5, message: 'Tối đa 5 ký tự' },
                ]}
              >
                <Input placeholder="A" />
              </Form.Item>
            </Col>
            <Col xs={16} md={18}>
              <Form.Item
                name="name"
                label="Tên đầu mục"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập tên' },
                  { max: 100, message: 'Tối đa 100 ký tự' },
                ]}
              >
                <Input placeholder="Bảo trì level 1" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="Giá trị dropdown (cột 3)"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập giá trị' },
                  { max: 30, message: 'Tối đa 30 ký tự' },
                ]}
              >
                <Input placeholder="BT-LV1" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item
                name="codeSuffix"
                label="Hậu tố mã"
                normalize={(value?: string) => value?.toUpperCase()}
                rules={[
                  { required: true, whitespace: true, message: 'Nhập hậu tố' },
                  { max: 10, message: 'Tối đa 10 ký tự' },
                  { pattern: /^[\p{L}\p{N}.]+$/u, message: 'Chỉ chữ, số, dấu chấm' },
                ]}
              >
                <Input placeholder="LV1" className="font-mono" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="sortOrder" label="Thứ tự" tooltip="Trống = xếp cuối">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="workshopIds" label="Xưởng áp dụng" extra="Để trống = áp dụng mọi xưởng">
                <Select mode="multiple" allowClear options={workshops} optionFilterProp="label" placeholder="Mọi xưởng" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="showInSummary" valuePropName="checked" className="mb-0">
                <Checkbox>Hiện thành 1 cột phút công trên Tổng hợp</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
