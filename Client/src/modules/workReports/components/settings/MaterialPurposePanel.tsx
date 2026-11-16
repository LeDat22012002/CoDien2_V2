import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Tooltip,
  type TableColumnsType,
} from "antd";
import { useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
// import { COLUMN_WIDTH } from "@/shared/constants/tableColumns";
import { EMPTY_TEXT } from "@/shared/utils/format";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { notify } from "@/shared/utils/notify";
import {
  useMaterialPurposes,
  useSaveMaterialPurpose,
  useSetMaterialPurposeActive,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type { MaterialPurpose } from "@/modules/workReports/types/workReports";

interface PurposeFormValues {
  code: string;
  name?: string;
  sortOrder?: number | null;
}

/** Mục đích sử dụng vật tư (BTBD, BTSC, TTTX…): dropdown cột "Mục đích" của vật tư. */
export const MaterialPurposePanel = () => {
  const [form] = Form.useForm<PurposeFormValues>();
  const [editing, setEditing] = useState<MaterialPurpose>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const purposesQuery = useMaterialPurposes(true);
  const saveMutation = useSaveMaterialPurpose();
  const activeMutation = useSetMaterialPurposeActive();

  const openForm = (purpose?: MaterialPurpose) => {
    setEditing(purpose);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    let values: PurposeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: editing?.id,
        request: {
          code: values.code.trim(),
          name: values.name?.trim() || undefined,
          sortOrder: values.sortOrder ?? undefined,
        },
      });
      notify.success(editing ? "Đã lưu mục đích." : "Đã thêm mục đích.");
      setIsFormOpen(false);
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  if (purposesQuery.isError && !purposesQuery.data) {
    return (
      <ErrorState
        error={purposesQuery.error}
        onRetry={() => purposesQuery.refetch()}
      />
    );
  }

  const columns: TableColumnsType<MaterialPurpose> = [
    { title: "Mục đích", dataIndex: "code", key: "code" },
    {
      title: "Diễn giải",
      dataIndex: "name",
      key: "name",
      render: (value?: string | null) => value || EMPTY_TEXT,
    },
    {
      title: "Thứ tự",
      dataIndex: "sortOrder",
      key: "sortOrder",
      align: "right",
    },
    {
      title: "Đang dùng",
      dataIndex: "isActive",
      key: "isActive",

      render: (value: boolean, purpose) => (
        <Switch
          checked={value}
          checkedChildren="Dùng"
          unCheckedChildren="Ngừng"
          aria-label={`Bật / ngừng mục đích ${purpose.code}`}
          loading={
            activeMutation.isPending &&
            activeMutation.variables?.id === purpose.id
          }
          onChange={async (checked) => {
            try {
              await activeMutation.mutateAsync({
                id: purpose.id,
                isActive: checked,
              });
            } catch (error) {
              notify.apiError(error);
            }
          }}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, purpose) => (
        <Tooltip title="Sửa">
          <Button
            type="text"
            aria-label={`Sửa mục đích ${purpose.code}`}
            icon={<EditOutlined className="text-primary" />}
            onClick={() => openForm(purpose)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openForm()}
        >
          Thêm mục đích
        </Button>
      </div>
      <Table<MaterialPurpose>
        rowKey="id"
        size="middle"
        bordered
        loading={purposesQuery.isFetching}
        columns={columns}
        dataSource={purposesQuery.data ?? []}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: "max-content" }}
        className="max-w-4xl [&_.ant-table-cell]:whitespace-nowrap"
        rowClassName={(purpose) => (purpose.isActive ? "" : "opacity-60")}
      />

      <Modal
        open={isFormOpen}
        title={
          editing
            ? `Sửa mục đích ${editing.code}`
            : "Thêm mục đích sử dụng vật tư"
        }
        okText={editing ? "Lưu thay đổi" : "Thêm"}
        cancelText="Hủy"
        onOk={handleSubmit}
        onCancel={() => setIsFormOpen(false)}
        confirmLoading={saveMutation.isPending}
        mask={{ closable: false }}
        width={{ xs: "94%", sm: 480 }}
        centered
        destroyOnHidden
      >
        <Form<PurposeFormValues>
          form={form}
          layout="vertical"
          preserve={false}
          className="pt-1"
          initialValues={
            editing
              ? {
                  code: editing.code,
                  name: editing.name ?? undefined,
                  sortOrder: editing.sortOrder,
                }
              : undefined
          }
        >
          <Form.Item
            name="code"
            label="Mục đích"
            rules={[
              { required: true, whitespace: true, message: "Nhập mục đích" },
              { max: 30, message: "Tối đa 30 ký tự" },
            ]}
          >
            <Input placeholder="BTBD" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Diễn giải"
            rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}
          >
            <Input placeholder="Bảo trì bảo dưỡng" />
          </Form.Item>
          <Form.Item
            name="sortOrder"
            label="Thứ tự"
            tooltip="Trống = xếp cuối"
            className="mb-0"
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
