import { AutoComplete, Col, Form, Input, Modal, Row } from "antd";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { notify } from "@/shared/utils/notify";
import {
  useCreateMaterial,
  useMaterialLookups,
  useUpdateMaterial,
} from "@/modules/materials/hooks/useMaterialQueries";
import type {
  Material,
  MaterialRequest,
} from "@/modules/materials/types/materials";

interface MaterialFormValues {
  code: string;
  description?: string;
  uom?: string;
  plant?: string;
  materialGroup?: string;
  typeOfSupplies?: string;
  materialLevel?: string;
  class?: string;
  bom?: string;
  documentNo?: string;
  basicDataText?: string;
  level?: string;
}

interface MaterialFormModalProps {
  open: boolean;
  /** Có = sửa vật tư này; không = thêm mới. Giữ lại khi đóng để nội dung không chớp. */
  material?: Material;
  onClose: () => void;
}

const optional = (value?: string) => value?.trim() || null;

const toRequest = (values: MaterialFormValues): MaterialRequest => ({
  code: values.code.trim(),
  description: optional(values.description),
  uom: optional(values.uom),
  plant: optional(values.plant),
  materialGroup: optional(values.materialGroup),
  typeOfSupplies: optional(values.typeOfSupplies),
  materialLevel: optional(values.materialLevel),
  class: optional(values.class),
  bom: optional(values.bom),
  documentNo: optional(values.documentNo),
  basicDataText: optional(values.basicDataText),
  level: optional(values.level),
});

const toFormValues = (material: Material): MaterialFormValues => ({
  code: material.code ?? "",
  description: material.description ?? undefined,
  uom: material.uom ?? undefined,
  plant: material.plant ?? undefined,
  materialGroup: material.materialGroup ?? undefined,
  typeOfSupplies: material.typeOfSupplies ?? undefined,
  materialLevel: material.materialLevel ?? undefined,
  class: material.class ?? undefined,
  bom: material.bom ?? undefined,
  documentNo: material.documentNo ?? undefined,
  basicDataText: material.basicDataText ?? undefined,
  level: material.level ?? undefined,
});

/** Gợi ý từ giá trị đã có trong danh mục nhưng vẫn cho gõ giá trị mới. */
const toOptions = (values?: string[]) =>
  (values ?? []).map((value) => ({ value }));

const filterOption = (input: string, option?: { value: string }) =>
  option?.value.toLowerCase().includes(input.trim().toLowerCase()) ?? false;

/** Thêm / sửa vật tư. Cùng mã được phép ở Plant khác nhau; trùng cả mã lẫn Plant thì Server báo lỗi ở ô mã. */
export const MaterialFormModal = ({
  open,
  material,
  onClose,
}: MaterialFormModalProps) => {
  const [form] = Form.useForm<MaterialFormValues>();
  const isCreate = !material;
  const lookupsQuery = useMaterialLookups();
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();

  const handleSubmit = async () => {
    let values: MaterialFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      if (material) {
        await updateMutation.mutateAsync({
          id: material.id,
          request: toRequest(values),
        });
        notify.success("Cập nhật vật tư thành công.");
      } else {
        await createMutation.mutateAsync(toRequest(values));
        notify.success("Thêm vật tư thành công.");
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={isCreate ? "Thêm vật tư" : "Sửa vật tư"}
      okText={isCreate ? "Thêm vật tư" : "Lưu thay đổi"}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: "94%", md: 760 }}
      centered
      destroyOnHidden
    >
      <Form<MaterialFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        className="max-h-[70dvh] overflow-y-auto pt-1 pr-1"
        initialValues={material ? toFormValues(material) : undefined}
      >
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item
              name="code"
              label="Mã vật tư"
              rules={[
                { required: true, whitespace: true, message: "Nhập mã vật tư" },
                { max: 200, message: "Tối đa 200 ký tự" },
              ]}
            >
              <Input className="font-mono" autoFocus />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="description"
              label="Tên vật tư"
              rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              name="uom"
              label="Đơn vị tính"
              tooltip="Tự điền vào ô ĐVT khi chọn mã vật tư ở báo cáo tuần"
              rules={[{ max: 20, message: "Tối đa 20 ký tự" }]}
            >
              <Input placeholder="VD: Cái, Bộ, Kg" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item
              name="plant"
              label="Plant"
              rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
            >
              <AutoComplete
                options={toOptions(lookupsQuery.data?.plants)}
                filterOption={filterOption}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="typeOfSupplies"
              label="Loại vật tư"
              rules={[{ max: 50, message: "Tối đa 50 ký tự" }]}
            >
              <AutoComplete
                options={toOptions(lookupsQuery.data?.typesOfSupplies)}
                filterOption={filterOption}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="materialGroup"
              label="Nhóm vật tư"
              rules={[{ max: 200, message: "Tối đa 200 ký tự" }]}
            >
              <AutoComplete
                options={toOptions(lookupsQuery.data?.materialGroups)}
                filterOption={filterOption}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="materialLevel"
              label="Cấp vật tư"
              rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
            >
              <AutoComplete
                options={toOptions(lookupsQuery.data?.materialLevels)}
                filterOption={filterOption}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="class"
              label="Class"
              rules={[{ max: 200, message: "Tối đa 200 ký tự" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="bom"
              label="BOM"
              rules={[{ max: 200, message: "Tối đa 200 ký tự" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="documentNo"
              label="Số tài liệu"
              rules={[{ max: 200, message: "Tối đa 200 ký tự" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="basicDataText"
              label="Basic data text"
              rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
            >
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="level"
              label="Level"
              rules={[{ max: 4000, message: "Tối đa 4000 ký tự" }]}
              className="mb-0"
            >
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
