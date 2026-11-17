import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import { toApiError } from "@/shared/api/axiosClient";
import dayjs from "@/shared/utils/dayjs";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { formatDate, formatNumber, toIsoDate } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import { ConflictResolveModal } from "@/modules/workReports/components/ConflictResolveModal";
import {
  diffConflictFields,
  type ConflictField,
} from "@/modules/workReports/utils/conflictFields";
import {
  MaterialCodeInput,
  type MaterialMatchSource,
} from "@/modules/workReports/components/MaterialCodeInput";
import {
  useMaterialPurposes,
  useSaveWorkMaterial,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  MaterialOption,
  WeeklyForm,
  WorkItemBase,
  WorkMaterial,
  WorkMaterialRequest,
  WorkReportPhase,
  WorkWeek,
} from "@/modules/workReports/types/workReports";

interface MaterialFormValues {
  workItemId: number;
  materialCode?: string;
  materialName: string;
  uom?: string;
  plannedQuantity?: number | null;
  actualQuantity?: number | null;
  usageDate?: Dayjs | null;
  materialPurposeId?: number | null;
  note?: string;
}

/** Giới hạn cột của vật tư báo cáo tuần (WorkMaterial); tên/ĐVT trong danh mục có thể dài hơn. */
const MATERIAL_NAME_MAX_LENGTH = 255;
const UOM_MAX_LENGTH = 20;

interface MaterialFormModalProps {
  open: boolean;
  form: WeeklyForm;
  phase: WorkReportPhase;
  week: WorkWeek;
  /** Có = sửa; không = thêm mới. */
  material?: WorkMaterial;
  onClose: () => void;
}

/**
 * Thêm / sửa vật tư gắn 1 dòng của giai đoạn đang xem (kế hoạch: dòng kế hoạch; báo cáo: dòng báo cáo).
 * Kế hoạch nhập số lượng KH; báo cáo nhập số lượng thực tế (vật tư chép từ kế hoạch: trống = bằng KH).
 * Ô Mã VT gợi ý từ Danh mục vật tư: chọn gợi ý → điền tên + ĐVT theo danh mục; gõ đúng mã rồi rời ô →
 * chỉ điền vào ô còn trống. Mã không có trong danh mục vẫn nhập tự do.
 */
export const MaterialFormModal = ({
  open,
  form,
  phase,
  week,
  material,
  onClose,
}: MaterialFormModalProps) => {
  const [formInstance] = Form.useForm<MaterialFormValues>();
  const purposesQuery = useMaterialPurposes();
  const saveMutation = useSaveWorkMaterial();
  const isPlan = phase === "PLAN";
  const workItems: WorkItemBase[] = form.items;
  /** Dòng nhắc dưới ô Mã VT sau khi tra danh mục; undefined = chưa tra. */
  const [catalogHint, setCatalogHint] = useState<string>();
  /** Lưu bị 409: bản mới nhất + ô khác nhau. */
  const [conflict, setConflict] = useState<{
    latest: WorkMaterial;
    fields: ConflictField[];
  }>();

  const purposeCodeOf = (id?: number | null) =>
    (purposesQuery.data ?? []).find((purpose) => purpose.id === id)?.code ?? "";
  const workItemCodeOf = (id?: number) =>
    workItems.find((item) => item.id === id)?.code ?? "";

  /** Ô để so khi xung đột. */
  const conflictFields = (
    values: MaterialFormValues,
    latest: WorkMaterial,
  ): ConflictField[] => [
    {
      label: "Mã công việc",
      mine: workItemCodeOf(values.workItemId),
      latest: latest.workItemCode,
    },
    {
      label: "Mã vật tư",
      mine: values.materialCode?.trim() ?? "",
      latest: latest.materialCode ?? "",
    },
    {
      label: "Tên vật tư",
      mine: values.materialName?.trim() ?? "",
      latest: latest.materialName,
    },
    { label: "ĐVT", mine: values.uom?.trim() ?? "", latest: latest.uom ?? "" },
    isPlan
      ? {
          label: "Số lượng KH",
          mine: formatNumber(values.plannedQuantity ?? null, 3),
          latest: formatNumber(latest.plannedQuantity, 3),
        }
      : {
          label: "Số lượng thực tế",
          mine: formatNumber(values.actualQuantity ?? null, 3),
          latest: formatNumber(latest.actualQuantity, 3),
        },
    {
      label: "Ngày sử dụng",
      mine: values.usageDate ? formatDate(toIsoDate(values.usageDate)) : "",
      latest: latest.usageDate ? formatDate(latest.usageDate) : "",
    },
    {
      label: "Mục đích",
      mine: purposeCodeOf(values.materialPurposeId),
      latest: latest.materialPurposeCode ?? "",
    },
    {
      label: "Ghi chú",
      mine: values.note?.trim() ?? "",
      latest: latest.note ?? "",
    },
  ];

  const handleMaterialMatch = (
    match: MaterialOption | null,
    source: MaterialMatchSource,
  ) => {
    if (!match) {
      setCatalogHint(
        "Mã chưa có trong danh mục vật tư – nhập tên, ĐVT bình thường.",
      );
      return;
    }

    setCatalogHint("Đã lấy tên, ĐVT theo danh mục vật tư.");
    const name = match.description?.slice(0, MATERIAL_NAME_MAX_LENGTH);
    const uom = match.uom?.slice(0, UOM_MAX_LENGTH);
    const current = formInstance.getFieldsValue(["materialName", "uom"]);
    // Chọn gợi ý = chủ động lấy theo danh mục (ghi đè); gõ tay = chỉ điền ô còn trống
    const shouldFill = (currentValue?: string) =>
      source === "select" || !currentValue?.trim();
    formInstance.setFieldsValue({
      ...(name && shouldFill(current.materialName)
        ? { materialName: name }
        : {}),
      ...(uom && shouldFill(current.uom) ? { uom } : {}),
    });
    if (name)
      void formInstance.validateFields(["materialName"]).catch(() => undefined);
  };

  /** rowVersionOverride: ghi đè sau xung đột (lưu với rowVersion của bản mới nhất). */
  const handleSubmit = async (rowVersionOverride?: string) => {
    let values: MaterialFormValues;
    try {
      values = await formInstance.validateFields();
    } catch {
      return;
    }

    const request: WorkMaterialRequest = {
      workItemId: values.workItemId,
      materialCode: values.materialCode?.trim() || null,
      materialName: values.materialName.trim(),
      uom: values.uom?.trim() || null,
      plannedQuantity: values.plannedQuantity ?? null,
      actualQuantity: values.actualQuantity ?? null,
      usageDate: toIsoDate(values.usageDate) ?? null,
      materialPurposeId: values.materialPurposeId ?? null,
      note: values.note?.trim() || null,
    };

    try {
      if (material) {
        await saveMutation.mutateAsync({
          mode: "update",
          id: material.id,
          phase,
          request: {
            ...request,
            rowVersion: rowVersionOverride ?? material.rowVersion,
          },
        });
        notify.success("Đã lưu vật tư.");
      } else {
        await saveMutation.mutateAsync({
          mode: "create",
          formId: form.formId,
          phase,
          request,
        });
        notify.success("Đã thêm vật tư.");
      }
      setConflict(undefined);
      onClose();
    } catch (error) {
      const apiError = toApiError(error);
      const latest = apiError.data as WorkMaterial | undefined;
      if (apiError.status === 409 && latest && material) {
        // Người khác vừa sửa: giữ bản đang nhập, cho xem khác nhau ở ô nào rồi chọn
        setConflict({
          latest,
          fields: diffConflictFields(conflictFields(values, latest)),
        });
        return;
      }
      if (!applyServerErrors(formInstance, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={material ? "Sửa vật tư" : "Thêm vật tư"}
      okText={material ? "Lưu thay đổi" : "Thêm vật tư"}
      cancelText="Hủy"
      onOk={() => void handleSubmit()}
      onCancel={onClose}
      confirmLoading={saveMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: "94%", md: 720 }}
      centered
      destroyOnHidden
    >
      <Form<MaterialFormValues>
        form={formInstance}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={
          material
            ? {
                workItemId: material.workItemId,
                materialCode: material.materialCode ?? undefined,
                materialName: material.materialName,
                uom: material.uom ?? undefined,
                plannedQuantity: material.plannedQuantity ?? null,
                actualQuantity: material.actualQuantity ?? null,
                usageDate: material.usageDate
                  ? dayjs(material.usageDate)
                  : null,
                materialPurposeId: material.materialPurposeId ?? null,
                note: material.note ?? undefined,
              }
            : undefined
        }
      >
        <Row gutter={12}>
          <Col xs={24}>
            <Form.Item
              name="workItemId"
              label="Mã công việc"
              rules={[
                { required: true, message: "Chọn dòng công việc dùng vật tư" },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn mã công việc"
                options={workItems.map((item) => ({
                  value: item.id,
                  label: `${item.code} – ${item.description}`,
                }))}
                notFoundContent={
                  isPlan
                    ? "Tổ/kíp chưa có dòng kế hoạch"
                    : "Tổ/kíp chưa có dòng báo cáo"
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="materialCode"
              label="Mã vật tư"
              rules={[{ max: 50, message: "Tối đa 50 ký tự" }]}
              extra={
                catalogHint ? (
                  <Typography.Text type="secondary" className="text-xs">
                    {catalogHint}
                  </Typography.Text>
                ) : undefined
              }
            >
              <MaterialCodeInput
                onMaterialMatch={handleMaterialMatch}
                onChange={() => setCatalogHint(undefined)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="materialName"
              label="Tên vật tư"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Nhập tên vật tư",
                },
                { max: 255, message: "Tối đa 255 ký tự" },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name="uom"
              label="ĐVT"
              rules={[{ max: 20, message: "Tối đa 20 ký tự" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            {isPlan ? (
              <Form.Item name="plannedQuantity" label="Số lượng KH">
                <InputNumber min={0} className="w-full" decimalSeparator="," />
              </Form.Item>
            ) : (
              <Form.Item
                name="actualQuantity"
                label="Số lượng thực tế"
                tooltip={
                  material?.isUnplanned === false
                    ? "Để trống = bằng số lượng kế hoạch"
                    : undefined
                }
                extra={
                  material?.plannedQuantity !== null &&
                  material?.plannedQuantity !== undefined ? (
                    <Typography.Text type="secondary">
                      KH: {formatNumber(material.plannedQuantity, 3)}
                    </Typography.Text>
                  ) : undefined
                }
              >
                <InputNumber min={0} className="w-full" decimalSeparator="," />
              </Form.Item>
            )}
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="usageDate" label="Ngày sử dụng">
              <DatePicker
                format="DD/MM/YYYY"
                className="w-full"
                minDate={dayjs(week.startDate)}
                maxDate={dayjs(week.endDate)}
                defaultPickerValue={dayjs(week.startDate)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="materialPurposeId" label="Mục đích">
              <Select
                allowClear
                loading={purposesQuery.isLoading}
                options={(purposesQuery.data ?? []).map((purpose) => ({
                  value: purpose.id,
                  label: purpose.code,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="note"
              label="Ghi chú"
              rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
              className="mb-0"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {conflict && (
        <ConflictResolveModal
          open
          subject={`Vật tư ${conflict.latest.materialCode ?? conflict.latest.materialName}`}
          updatedByName={
            conflict.latest.updatedByName ?? conflict.latest.updatedBy
          }
          updatedAt={conflict.latest.updatedAt}
          fields={conflict.fields}
          saving={saveMutation.isPending}
          onUseLatest={() => {
            setConflict(undefined);
            onClose();
          }}
          onOverwrite={() => void handleSubmit(conflict.latest.rowVersion)}
          onClose={() => setConflict(undefined)}
        />
      )}
    </Modal>
  );
};
