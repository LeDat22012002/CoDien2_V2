import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button, DatePicker, Popover, Space, Tooltip, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useState } from "react";
import dayjs from "@/shared/utils/dayjs";
import { formatDateTime } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import { PHASE_LABELS } from "@/modules/workReports/constants/workReportOptions";
import { useUnlockWeeklyForm } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  WeeklyFormBase,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";

/** Server cho mở khóa tối đa 30 ngày. */
const MAX_UNLOCK_DAYS = 30;

interface FormUnlockButtonProps {
  form: WeeklyFormBase;
  phase: WorkReportPhase;
}

/**
 * Admin mở khóa giai đoạn đã quá hạn của 1 tổ/kíp tới thời điểm chọn (mặc định hết ngày mai), hoặc khóa lại ngay.
 * Chỉ hiện khi form.canUnlock và giai đoạn đã khóa / đang được mở khóa.
 */
export const FormUnlockButton = ({ form, phase }: FormUnlockButtonProps) => {
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState<Dayjs | null>(null);
  const mutation = useUnlockWeeklyForm();
  const phaseLabel = PHASE_LABELS[phase].toLowerCase();

  if (!form.canUnlock || (form.status !== "LOCKED" && !form.isUnlocked))
    return null;

  const submit = async (value: Dayjs | null) => {
    try {
      await mutation.mutateAsync({
        phase,
        formId: form.formId,
        until: value ? value.format("YYYY-MM-DDTHH:mm:ss") : null,
      });
      notify.success(
        value
          ? `Đã mở khóa ${phaseLabel} ${form.unitName} tới ${value.format("HH:mm DD/MM/YYYY")}.`
          : `Đã khóa lại ${phaseLabel} ${form.unitName}.`,
      );
      setOpen(false);
    } catch (error) {
      notify.apiError(error);
    }
  };

  const content = (
    <div className="flex w-72 flex-col gap-2">
      <Typography.Text type="secondary">
        Mở cho người có quyền thêm/sửa/xóa {phaseLabel} tới:
      </Typography.Text>
      <DatePicker
        showTime={{ format: "HH:mm" }}
        format="HH:mm DD/MM/YYYY"
        aria-label="Mở khóa tới"
        value={until}
        onChange={setUntil}
        minDate={dayjs()}
        maxDate={dayjs().add(MAX_UNLOCK_DAYS, "day")}
        className="w-full"
      />
      <Space className="justify-end">
        {form.isUnlocked && (
          <Button
            danger
            icon={<LockOutlined />}
            loading={mutation.isPending}
            onClick={() => submit(null)}
          >
            Khóa lại
          </Button>
        )}
        <Button
          type="primary"
          icon={<UnlockOutlined />}
          disabled={!until}
          loading={mutation.isPending}
          onClick={() => submit(until)}
        >
          Mở khóa
        </Button>
      </Space>
    </div>
  );

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next)
          setUntil(dayjs().add(1, "day").endOf("day").startOf("minute"));
      }}
      title={`${form.isUnlocked ? "Đang mở khóa" : "Mở khóa"} ${phaseLabel} – ${form.unitName}`}
      content={content}
    >
      <Tooltip
        title={
          form.isUnlocked
            ? `Đang mở khóa tới ${formatDateTime(form.deadlineAt)}`
            : "Đã quá hạn: chỉ quản trị mở khóa"
        }
      >
        <Button
          size="small"
          type="link"
          icon={form.isUnlocked ? <UnlockOutlined /> : <LockOutlined />}
        >
          {form.isUnlocked ? "Đang mở khóa" : "Mở khóa"}
        </Button>
      </Tooltip>
    </Popover>
  );
};
