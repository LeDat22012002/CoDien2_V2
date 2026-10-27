import { CloseOutlined, EditOutlined, LockOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Grid, Input, InputNumber, Select, Table, Tag, Tooltip, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { PERMISSION_CODES } from '@/shared/constants/permissionCodes';
import type { DisplayMode, PositionLevel } from '@/shared/types/organization';
import { EMPTY_TEXT } from '@/shared/utils/format';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { useHasPermission } from '@/stores/authStore';
import { ChartRowPreview } from '@/modules/organization/components/ChartRowPreview';
import {
  CHART_ROW_OPTIONS,
  DISPLAY_MODE_OPTIONS,
  FIXED_CHART_ROWS,
} from '@/modules/organization/constants/organization';
import { usePositionLevels, useUpdatePositionLevel } from '@/modules/organization/hooks/useOrganizationQueries';

interface PositionLevelFormValues {
  name: string;
  rank: number;
  chartRow: number;
  displayMode: DisplayMode;
  blockLabel?: string;
}

/**
 * Cấp bậc & hiển thị (route /admin/position-levels), dựng lại theo ManageCapBac hệ thống cũ:
 * sửa tên, thứ tự, hàng hiển thị trên sơ đồ, nhãn khối của từng cấp bậc (sửa trực tiếp trên dòng).
 * Đổi hàng của 1 cấp = đổi hàng của mọi đơn vị / người thuộc cấp đó; đổi riêng 1 đơn vị dùng "Cấp trưởng đơn vị"
 * ở trang Cơ cấu tổ chức.
 */
const PositionLevelPage = () => {
  const [form] = Form.useForm<PositionLevelFormValues>();
  const screens = Grid.useBreakpoint();
  const [editingCode, setEditingCode] = useState<string>();
  const canManage = useHasPermission(PERMISSION_CODES.orgUnits.manage);

  const levelsQuery = usePositionLevels();
  const updateMutation = useUpdatePositionLevel();
  const draftName = Form.useWatch('name', form);
  const draftRow = Form.useWatch('chartRow', form);

  const levels = useMemo(() => [...(levelsQuery.data ?? [])].sort((a, b) => a.rank - b.rank), [levelsQuery.data]);

  // Xem trước: áp giá trị đang sửa lên danh sách
  const previewLevels = useMemo(
    () =>
      levels.map((level) =>
        level.code === editingCode
          ? { ...level, name: draftName || level.name, chartRow: draftRow ?? level.chartRow }
          : level,
      ),
    [levels, editingCode, draftName, draftRow],
  );

  const startEdit = (level: PositionLevel) => {
    form.setFieldsValue({
      name: level.name,
      rank: level.rank,
      chartRow: level.chartRow,
      displayMode: level.displayMode,
      blockLabel: level.blockLabel ?? undefined,
    });
    setEditingCode(level.code);
  };

  const cancelEdit = () => {
    form.resetFields();
    setEditingCode(undefined);
  };

  const save = async (code: string) => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    // Lấy cả giá trị không có ô nhập (hàng cố định của GĐ / PGĐ không hiện ô chọn)
    const values = form.getFieldsValue(true) as PositionLevelFormValues;
    try {
      await updateMutation.mutateAsync({
        code,
        request: {
          name: values.name.trim(),
          rank: values.rank,
          chartRow: values.chartRow,
          displayMode: values.displayMode,
          blockLabel: values.blockLabel?.trim() || undefined,
        },
      });
      notify.success('Cập nhật cấp bậc thành công.');
      cancelEdit();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  const isEditing = (level: PositionLevel) => level.code === editingCode;

  const columns: TableColumnsType<PositionLevel> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: COLUMN_WIDTH.code,
      render: (code: string) => <Tag className="font-mono">{code}</Tag>,
    },
    {
      title: 'Tên cấp bậc',
      dataIndex: 'name',
      key: 'name',
      width: COLUMN_WIDTH.text,
      render: (name: string, level) =>
        isEditing(level) ? (
          <Form.Item
            name="name"
            className="mb-0"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
          >
            <Input aria-label="Tên cấp bậc" />
          </Form.Item>
        ) : (
          <span className="font-medium">{name}</span>
        ),
    },
    {
      title: (
        <Tooltip title="Số nhỏ = cấp cao. Dùng để sắp xếp danh sách và gợi ý Lên cấp / Xuống cấp khi điều chuyển.">
          Thứ tự
        </Tooltip>
      ),
      dataIndex: 'rank',
      key: 'rank',
      width: COLUMN_WIDTH.number,
      render: (rank: number, level) =>
        isEditing(level) ? (
          <Form.Item name="rank" className="mb-0" rules={[{ required: true, message: 'Nhập thứ tự' }]}>
            <InputNumber aria-label="Thứ tự" min={1} max={999} className="w-full" />
          </Form.Item>
        ) : (
          rank
        ),
    },
    {
      title: 'Hàng trên sơ đồ',
      dataIndex: 'chartRow',
      key: 'chartRow',
      width: COLUMN_WIDTH.select,
      render: (chartRow: number, level) => {
        const isFixed = level.code in FIXED_CHART_ROWS;
        if (isEditing(level) && !isFixed) {
          return (
            <Form.Item name="chartRow" className="mb-0" rules={[{ required: true, message: 'Chọn hàng' }]}>
              <Select aria-label="Hàng trên sơ đồ" options={CHART_ROW_OPTIONS} />
            </Form.Item>
          );
        }
        return (
          <span>
            Hàng {chartRow}
            {isFixed && (
              <Tooltip title="Ban Giám đốc luôn ở hàng 1–2, không đổi được">
                <LockOutlined className="ml-1.5 text-text-secondary" aria-label="Không đổi được" />
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      title: (
        <Tooltip title="Hiện sơ đồ: trưởng / phó đơn vị luôn là ô riêng, thành viên luôn gộp khối. Cột này để dành cho sau.">
          Kiểu hiển thị
        </Tooltip>
      ),
      dataIndex: 'displayMode',
      key: 'displayMode',
      width: COLUMN_WIDTH.select,
      render: (displayMode: DisplayMode, level) =>
        isEditing(level) ? (
          <Form.Item name="displayMode" className="mb-0">
            <Select aria-label="Kiểu hiển thị" options={DISPLAY_MODE_OPTIONS} />
          </Form.Item>
        ) : (
          <Tag color={displayMode === 'BLOCK' ? 'blue' : 'default'}>{displayMode}</Tag>
        ),
    },
    {
      title: 'Nhãn khối',
      dataIndex: 'blockLabel',
      key: 'blockLabel',
      width: COLUMN_WIDTH.text,
      render: (blockLabel: string | null | undefined, level) =>
        isEditing(level) ? (
          <Form.Item name="blockLabel" className="mb-0" rules={[{ max: 50, message: 'Tối đa 50 ký tự' }]}>
            <Input aria-label="Nhãn khối" placeholder="VD: Kỹ sư" />
          </Form.Item>
        ) : (
          blockLabel || <span className="text-text-secondary">{EMPTY_TEXT}</span>
        ),
    },
    ...(canManage
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            width: COLUMN_WIDTH.actions,
            align: 'center' as const,
            render: (_: unknown, level: PositionLevel) =>
              isEditing(level) ? (
                <div className="flex justify-center gap-1">
                  <Tooltip title="Lưu">
                    <Button
                      type="text"
                      aria-label={`Lưu cấp bậc ${level.name}`}
                      icon={<SaveOutlined className="text-primary" />}
                      loading={updateMutation.isPending}
                      onClick={() => save(level.code)}
                    />
                  </Tooltip>
                  <Tooltip title="Hủy">
                    <Button
                      type="text"
                      aria-label="Hủy sửa"
                      icon={<CloseOutlined />}
                      onClick={cancelEdit}
                      disabled={updateMutation.isPending}
                    />
                  </Tooltip>
                </div>
              ) : (
                <Tooltip title="Sửa">
                  <Button
                    type="text"
                    aria-label={`Sửa cấp bậc ${level.name}`}
                    icon={<EditOutlined className="text-primary" />}
                    disabled={Boolean(editingCode)}
                    onClick={() => startEdit(level)}
                  />
                </Tooltip>
              ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Cấp bậc & hiển thị"
        description='Hàng của 1 cấp áp dụng cho mọi đơn vị / người thuộc cấp đó. Đổi riêng 1 đơn vị: sửa "Cấp trưởng đơn vị" ở trang Cơ cấu tổ chức.'
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => levelsQuery.refetch()}
            loading={levelsQuery.isFetching}
            disabled={Boolean(editingCode)}
          >
            Tải lại
          </Button>
        }
      />

      {levelsQuery.isError ? (
        <ErrorState error={levelsQuery.error} onRetry={() => levelsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-md bg-bg-container p-3 md:p-4">
            <Form form={form} component={false}>
              <Table<PositionLevel>
                rowKey="code"
                size="middle"
                bordered
                loading={levelsQuery.isPending}
                columns={columns}
                dataSource={levels}
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: getTableScrollX(columns, screens) }}
                rowClassName={(level) => (isEditing(level) ? 'bg-blue-50' : '')}
              />
            </Form>
          </div>

          <ChartRowPreview levels={previewLevels} editingCode={editingCode} />
        </div>
      )}
    </div>
  );
};

export default PositionLevelPage;
