import { Form, Input, Modal } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { IncidentSummary } from '@/modules/incidents/components/IncidentSummary';
import { useUpdateIncidentAnalysis } from '@/modules/incidents/hooks/useIncidentQueries';
import type { Incident } from '@/modules/incidents/types/incidents';

interface AnalysisFormValues {
  cause?: string;
  rootCause?: string;
  correctiveAction?: string;
}

interface IncidentAnalysisModalProps {
  open: boolean;
  /** Báo cáo đang thao tác (giữ lại khi đóng để nội dung không chớp). */
  incident: Incident | null;
  onClose: () => void;
}

const LONG_TEXT_RULES = [{ max: 4000, message: 'Tối đa 4000 ký tự' }];

/**
 * Phân tích sự cố (PhanTichSuCoModal hệ thống cũ): Nguyên nhân, Nguyên nhân gốc sau phân tích, Hành động khắc phục.
 * Quá 7 ngày kể từ khi nhập mà chưa đủ 3 ô thì báo cáo bị đánh dấu quá hạn.
 */
export const IncidentAnalysisModal = ({ open, incident, onClose }: IncidentAnalysisModalProps) => {
  const [form] = Form.useForm<AnalysisFormValues>();
  const mutation = useUpdateIncidentAnalysis();

  const handleSubmit = async () => {
    if (!incident) return;
    let values: AnalysisFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await mutation.mutateAsync({
        id: incident.id,
        request: {
          cause: values.cause?.trim() || undefined,
          rootCause: values.rootCause?.trim() || undefined,
          correctiveAction: values.correctiveAction?.trim() || undefined,
        },
      });
      notify.success('Cập nhật phân tích thành công.');
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Phân tích sự cố"
      okText="Lưu"
      cancelText="Đóng"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={mutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 760 }}
      centered
      destroyOnHidden
    >
      {incident && (
        <>
          <IncidentSummary incident={incident} />
          {incident.description && (
            <div className="mb-4 rounded-md bg-bg-layout px-3 py-2 text-sm">
              <div className="font-semibold">Mô tả sự cố</div>
              <div className="wrap-break-word whitespace-pre-wrap text-text-secondary">{incident.description}</div>
            </div>
          )}
          <Form<AnalysisFormValues>
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={{
              cause: incident.cause ?? undefined,
              rootCause: incident.rootCause ?? undefined,
              correctiveAction: incident.correctiveAction ?? undefined,
            }}
          >
            <Form.Item name="cause" label="Nguyên nhân" rules={LONG_TEXT_RULES}>
              <Input.TextArea rows={3} placeholder="Nguyên nhân trực tiếp gây sự cố" autoFocus />
            </Form.Item>
            <Form.Item name="rootCause" label="Nguyên nhân gốc sau phân tích" rules={LONG_TEXT_RULES}>
              <Input.TextArea rows={3} placeholder="Nguyên nhân gốc rễ" />
            </Form.Item>
            <Form.Item name="correctiveAction" label="Hành động khắc phục" rules={LONG_TEXT_RULES}>
              <Input.TextArea rows={3} placeholder="Hành động khắc phục / phòng ngừa" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};
