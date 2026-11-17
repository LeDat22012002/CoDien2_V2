import { Alert, Button, Modal, Table, Typography } from "antd";
import { formatDateTime } from "@/shared/utils/format";
import type { ConflictField } from "@/modules/workReports/utils/conflictFields";

interface ConflictResolveModalProps {
  open: boolean;
  /** Vd "Dòng CK-LC6-LV1-03" / "Vật tư 1120019900012". */
  subject: string;
  updatedByName?: string | null;
  updatedAt?: string | null;
  fields: ConflictField[];
  saving: boolean;
  /** Bỏ bản của mình, lấy bản mới nhất. */
  onUseLatest: () => void;
  /** Lưu bản của mình đè lên bản mới nhất. */
  onOverwrite: () => void;
  /** Đóng, tiếp tục sửa (lưu lại sẽ hỏi tiếp nếu vẫn lệch). */
  onClose: () => void;
}

/**
 * Lưu bị từ chối vì người khác vừa sửa (409): không mất dữ liệu đang gõ, cho xem 2 bản khác nhau ở ô nào
 * rồi chọn dùng bản mới nhất hoặc ghi đè bằng bản của mình.
 */
export const ConflictResolveModal = ({
  open,
  subject,
  updatedByName,
  updatedAt,
  fields,
  saving,
  onUseLatest,
  onOverwrite,
  onClose,
}: ConflictResolveModalProps) => (
  <Modal
    open={open}
    title={`${subject} vừa được người khác sửa`}
    onCancel={onClose}
    mask={{ closable: false }}
    width={{ xs: "94%", md: 720 }}
    centered
    destroyOnHidden
    footer={[
      <Button key="close" onClick={onClose}>
        Tiếp tục sửa
      </Button>,
      <Button key="latest" onClick={onUseLatest} disabled={saving}>
        Dùng bản mới nhất
      </Button>,
      <Button
        key="overwrite"
        type="primary"
        danger
        loading={saving}
        onClick={onOverwrite}
      >
        Ghi đè bằng bản của tôi
      </Button>,
    ]}
  >
    <Alert
      type="warning"
      showIcon
      className="mb-3"
      message={
        <>
          {updatedByName ? <b>{updatedByName}</b> : "Người khác"} đã lưu
          {updatedAt ? ` lúc ${formatDateTime(updatedAt)}` : ""} trong lúc bạn
          đang sửa. Dữ liệu bạn vừa nhập vẫn còn.
        </>
      }
    />
    {fields.length > 0 ? (
      <Table<ConflictField>
        size="small"
        bordered
        pagination={false}
        rowKey="label"
        dataSource={fields}
        columns={[
          { title: "Ô", dataIndex: "label", width: 140 },
          {
            title: "Bản của bạn",
            dataIndex: "mine",
            render: (value: string) => (
              <span className="whitespace-pre-line wrap-break-word">
                {value || "—"}
              </span>
            ),
          },
          {
            title: "Bản mới nhất",
            dataIndex: "latest",
            render: (value: string) => (
              <span className="whitespace-pre-line wrap-break-word">
                {value || "—"}
              </span>
            ),
          },
        ]}
      />
    ) : (
      <Typography.Text type="secondary">
        Các ô bạn đang sửa giống bản mới nhất; ghi đè sẽ không làm mất thay đổi
        của người kia.
      </Typography.Text>
    )}
  </Modal>
);
