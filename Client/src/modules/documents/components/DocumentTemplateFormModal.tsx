import { Form, Input, InputNumber, Modal } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { useCreateDocumentTemplate, useUpdateDocumentTemplate } from '@/modules/documents/hooks/useDocumentQueries';
import type { DocumentTemplate, DocumentTemplateRequest } from '@/modules/documents/types/documents';

interface DocumentTemplateFormValues {
  name: string;
  code: string;
  numberSuffix: string;
  startNumber?: number | null;
  process?: string;
  description?: string;
}

interface DocumentTemplateFormModalProps {
  open: boolean;
  /** Có = sửa biểu mẫu này; không = thêm mới. Giữ lại khi đóng để nội dung không chớp. */
  template?: DocumentTemplate;
  onClose: () => void;
}

const toRequest = (values: DocumentTemplateFormValues): DocumentTemplateRequest => ({
  name: values.name.trim(),
  code: values.code.trim(),
  numberSuffix: values.numberSuffix.trim(),
  startNumber: values.startNumber ?? undefined,
  process: values.process?.trim() || undefined,
  description: values.description?.trim() || undefined,
});

/**
 * Thêm / sửa văn bản cần lấy số (CreateBieuMau / UpdateBieuMau hệ thống cũ).
 * Đuôi số được ghép vào số hiệu khi cấp số, vd 01/2026/{Đuôi số}.
 */
export const DocumentTemplateFormModal = ({ open, template, onClose }: DocumentTemplateFormModalProps) => {
  const [form] = Form.useForm<DocumentTemplateFormValues>();
  const isCreate = !template;
  const createMutation = useCreateDocumentTemplate();
  const updateMutation = useUpdateDocumentTemplate();

  const handleSubmit = async () => {
    let values: DocumentTemplateFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      if (template) {
        await updateMutation.mutateAsync({ id: template.id, request: toRequest(values) });
        notify.success('Cập nhật văn bản thành công.');
      } else {
        await createMutation.mutateAsync(toRequest(values));
        notify.success('Thêm văn bản thành công.');
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={isCreate ? 'Thêm văn bản' : 'Sửa văn bản'}
      okText={isCreate ? 'Thêm văn bản' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 560 }}
      centered
      destroyOnHidden
    >
      <Form<DocumentTemplateFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={
          template
            ? {
                name: template.name,
                code: template.code,
                numberSuffix: template.numberSuffix,
                startNumber: template.startNumber,
                process: template.process ?? undefined,
                description: template.description ?? undefined,
              }
            : undefined
        }
      >
        <Form.Item
          name="name"
          label="Tên văn bản"
          rules={[
            { required: true, whitespace: true, message: 'Nhập tên văn bản' },
            { max: 255, message: 'Tối đa 255 ký tự' },
          ]}
        >
          <Input placeholder="VD: Biên bản làm việc" autoFocus />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="code"
            label="Mã văn bản"
            rules={[
              { required: true, whitespace: true, message: 'Nhập mã văn bản' },
              { max: 50, message: 'Tối đa 50 ký tự' },
            ]}
          >
            <Input placeholder="VD: BM.12A-QT.09" className="font-mono" />
          </Form.Item>
          <Form.Item
            name="numberSuffix"
            label="Số hiệu văn bản (đuôi số)"
            rules={[
              { required: true, whitespace: true, message: 'Nhập đuôi số' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
            tooltip="Ghép vào cuối số hiệu khi lấy số, vd 01/2026/BBLV-NM.CĐ2"
          >
            <Input placeholder="VD: BBLV-NM.CĐ2" className="font-mono" />
          </Form.Item>
          <Form.Item
            name="startNumber"
            label="Số bắt đầu"
            tooltip="Giữ để tham khảo như hệ thống cũ; mỗi năm số thứ tự luôn bắt đầu lại từ 01."
          >
            <InputNumber min={0} max={999_999} precision={0} placeholder="VD: 1" className="w-full" />
          </Form.Item>
          <Form.Item name="process" label="Quy trình" rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}>
            <Input placeholder="VD: QT.09" />
          </Form.Item>
        </div>
        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
          className="mb-0"
        >
          <Input.TextArea rows={3} maxLength={500} placeholder="Văn bản dùng khi nào, cho ai…" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
