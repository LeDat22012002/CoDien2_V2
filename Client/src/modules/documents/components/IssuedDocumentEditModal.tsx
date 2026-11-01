import { Descriptions, Form, Input, Modal, Select } from 'antd';
import { formatDate, formatDateTime } from '@/shared/utils/format';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { PUBLISH_STATUS_OPTIONS } from '@/modules/documents/constants/documentOptions';
import { useUpdateIssuedDocument } from '@/modules/documents/hooks/useDocumentQueries';
import type { IssuedDocument, PublishStatus } from '@/modules/documents/types/documents';

interface IssuedDocumentFormValues {
  subject?: string;
  publishStatus: PublishStatus;
  eOfficeLink?: string;
  note?: string;
}

interface IssuedDocumentEditModalProps {
  open: boolean;
  /** Văn bản đang sửa (giữ lại khi đóng để nội dung không chớp). */
  document: IssuedDocument | null;
  onClose: () => void;
}

/**
 * Cập nhật văn bản đã cấp số (modal "Cập nhật văn bản" ở ManageBMDaLaySo hệ thống cũ):
 * trích yếu, trạng thái ban hành, link eOffice, ghi chú. Ô để trống thì Server giữ nguyên giá trị cũ.
 */
export const IssuedDocumentEditModal = ({ open, document, onClose }: IssuedDocumentEditModalProps) => {
  const [form] = Form.useForm<IssuedDocumentFormValues>();
  const mutation = useUpdateIssuedDocument();

  const handleSubmit = async () => {
    if (!document) return;
    let values: IssuedDocumentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await mutation.mutateAsync({
        id: document.id,
        request: {
          subject: values.subject?.trim() || undefined,
          publishStatus: values.publishStatus,
          eOfficeLink: values.eOfficeLink?.trim() || undefined,
          note: values.note?.trim() || undefined,
        },
      });
      notify.success('Cập nhật văn bản thành công.');
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Cập nhật văn bản"
      okText="Lưu"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={mutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 640 }}
      centered
      destroyOnHidden
    >
      {document && (
        <>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2 }}
            className="mb-4"
            items={[
              {
                key: 'number',
                label: 'Số hiệu',
                span: 'filled',
                children: <span className="font-semibold">{document.documentNumber}</span>,
              },
              { key: 'template', label: 'Văn bản', span: 'filled', children: document.templateName },
              { key: 'issuer', label: 'Người lấy số', children: `${document.issuerName} (${document.issuerEmpCode})` },
              { key: 'unit', label: 'Phân xưởng', children: document.issuerUnit },
              { key: 'issueDate', label: 'Ngày ban hành', children: formatDate(document.issueDate) },
              { key: 'issuedAt', label: 'Thời điểm lấy số', children: formatDateTime(document.issuedAt) },
            ]}
          />
          <Form<IssuedDocumentFormValues>
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={{
              subject: document.subject ?? undefined,
              publishStatus: document.publishStatus,
              eOfficeLink: document.eOfficeLink ?? undefined,
              note: document.note ?? undefined,
            }}
          >
            <Form.Item
              name="subject"
              label="Nội dung trích yếu"
              rules={[{ max: 1000, message: 'Tối đa 1000 ký tự' }]}
            >
              <Input.TextArea rows={2} placeholder="Nội dung trích yếu" autoFocus />
            </Form.Item>
            <Form.Item
              name="publishStatus"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái' }]}
            >
              <Select aria-label="Trạng thái" options={PUBLISH_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="eOfficeLink"
              label="Link eOffice"
              rules={[
                { type: 'url', message: 'Link không hợp lệ (bắt đầu bằng http:// hoặc https://)' },
                { max: 1000, message: 'Tối đa 1000 ký tự' },
              ]}
            >
              <Input allowClear placeholder="https://eoffice.hoaphat.com/..." />
            </Form.Item>
            <Form.Item
              name="note"
              label="Ghi chú"
              rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
              className="mb-0"
            >
              <Input.TextArea rows={3} placeholder="Ghi chú" />
            </Form.Item>
          </Form>
          <p className="mt-3 mb-0 text-sm text-text-secondary">
            Trích yếu, link eOffice, ghi chú để trống sẽ giữ nguyên nội dung cũ.
          </p>
        </>
      )}
    </Modal>
  );
};
