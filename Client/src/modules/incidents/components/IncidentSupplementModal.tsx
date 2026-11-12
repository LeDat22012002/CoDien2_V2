import { Alert, Form, Input, Modal } from "antd";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { notify } from "@/shared/utils/notify";
import { IncidentSummary } from "@/modules/incidents/components/IncidentSummary";
import { REPORT_REQUIRED_DOWNTIME_MINUTES } from "@/modules/incidents/constants/incidentOptions";
import { useUpdateIncidentSupplement } from "@/modules/incidents/hooks/useIncidentQueries";
import type { Incident } from "@/modules/incidents/types/incidents";

interface SupplementFormValues {
  orderNumber?: string;
  reportLink?: string;
  incidentReportLink?: string;
}

const URL_RULES = [
  {
    type: "url" as const,
    message: "Link không hợp lệ (bắt đầu bằng http:// hoặc https://)",
  },
  { max: 500, message: "Tối đa 500 ký tự" },
];

interface IncidentSupplementModalProps {
  open: boolean;
  /** Báo cáo đang thao tác (giữ lại khi đóng để nội dung không chớp). */
  incident: Incident | null;
  onClose: () => void;
}

/**
 * Bổ sung số order, link biên bản sự cố (BoSungSuCoModal hệ thống cũ) và link báo cáo sự cố
 * (bắt buộc nếu sự cố ảnh hưởng sản xuất).
 */
export const IncidentSupplementModal = ({
  open,
  incident,
  onClose,
}: IncidentSupplementModalProps) => {
  const [form] = Form.useForm<SupplementFormValues>();
  const mutation = useUpdateIncidentSupplement();
  const isReportRequired =
    (incident?.downtimeMinutes ?? 0) > REPORT_REQUIRED_DOWNTIME_MINUTES;

  const handleSubmit = async () => {
    if (!incident) return;
    let values: SupplementFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await mutation.mutateAsync({
        id: incident.id,
        request: {
          orderNumber: values.orderNumber?.trim() || undefined,
          reportLink: values.reportLink?.trim() || undefined,
          incidentReportLink: values.incidentReportLink?.trim() || undefined,
        },
      });
      notify.success("Bổ sung thông tin thành công.");
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Bổ sung số order, link biên bản, link báo cáo"
      okText="Lưu"
      cancelText="Đóng"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={mutation.isPending}
      mask={{ closable: false }}
      width={{ xs: "94%", md: 640 }}
      centered
      destroyOnHidden
    >
      {incident && (
        <>
          <IncidentSummary incident={incident} />
          {incident.affectsProduction && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title={
                isReportRequired
                  ? `Sự cố ảnh hưởng sản xuất, dừng quá ${REPORT_REQUIRED_DOWNTIME_MINUTES} phút: cần đủ Số order, Link biên bản và Link báo cáo sự cố.`
                  : "Sự cố ảnh hưởng sản xuất: cần nhập Số order và Link báo cáo sự cố."
              }
            />
          )}
          <Form<SupplementFormValues>
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={{
              orderNumber: incident.orderNumber ?? undefined,
              reportLink: incident.reportLink ?? undefined,
              incidentReportLink: incident.incidentReportLink ?? undefined,
            }}
          >
            <Form.Item
              name="orderNumber"
              label="Số order"
              rules={[{ max: 100, message: "Tối đa 100 ký tự" }]}
            >
              <Input allowClear placeholder="Nhập số order" autoFocus />
            </Form.Item>
            <Form.Item
              name="reportLink"
              label="Link biên bản sự cố"
              rules={URL_RULES}
            >
              <Input allowClear placeholder="https://..." />
            </Form.Item>
            <Form.Item
              name="incidentReportLink"
              label="Link báo cáo sự cố"
              rules={[
                {
                  required: incident.affectsProduction,
                  whitespace: true,
                  message: "Sự cố ảnh hưởng sản xuất: bắt buộc nhập Link báo cáo sự cố",
                },
                ...URL_RULES,
              ]}
            >
              <Input allowClear placeholder="https://..." />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};
