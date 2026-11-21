import { FileExcelOutlined } from "@ant-design/icons";
import { App, Button, Tooltip } from "antd";
import { useState } from "react";
import {
  downloadWorkReportExcel,
  type WorkReportExportParams,
} from "@/modules/workReports/api/workReportExport";

/**
 * Nút "Xuất Excel" của xưởng / tuần / giai đoạn đang xem (theo form Excel các xưởng đang dùng).
 * Chỉ hiện khi có quyền work-reports.export (cờ canExport của my-scope); Server kiểm tra lại quyền và phạm vi.
 */
export const ExportExcelButton = (params: WorkReportExportParams) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const phaseText = params.phase === "PLAN" ? "kế hoạch" : "báo cáo";

  const handleExport = async () => {
    setLoading(true);
    try {
      await downloadWorkReportExcel(params);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Xuất Excel không thành công.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      title={`Xuất Excel ${phaseText} tuần này của xưởng (các tổ/kíp bạn xem được)`}
    >
      <Button
        icon={<FileExcelOutlined />}
        loading={loading}
        onClick={handleExport}
      >
        Xuất Excel
      </Button>
    </Tooltip>
  );
};
