import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, List, Modal, Select, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { notify } from '@/shared/utils/notify';
import {
  useEngineerSuggestions,
  useSetUnitEngineers,
  useWorkerOptions,
} from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkReportUnit } from '@/modules/workReports/types/workReports';

const SEARCH_DEBOUNCE_MS = 300;

interface SelectedEngineer {
  employeeId: number;
  label: string;
}

interface UnitEngineersModalProps {
  open: boolean;
  unit?: WorkReportUnit;
  onClose: () => void;
}

/**
 * Phân công kỹ sư phụ trách (người được nhập form của tổ/kíp). Lưu cả danh sách:
 * người bỏ ra mất quyền ngay, người thêm vào có quyền từ hôm nay.
 * Gợi ý từ sơ đồ tổ chức (cấp KS ở tổ/kíp, đội); tìm thêm người trong xưởng.
 */
export const UnitEngineersModal = ({ open, unit, onClose }: UnitEngineersModalProps) => {
  const [selected, setSelected] = useState<SelectedEngineer[]>([]);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim(), SEARCH_DEBOUNCE_MS);
  const suggestionsQuery = useEngineerSuggestions(unit?.id, open);
  const searchQuery = useWorkerOptions(open ? unit?.id : undefined, 'WORKSHOP', debouncedKeyword);
  const saveMutation = useSetUnitEngineers();

  // Mở modal: lấy danh sách đang phụ trách làm giá trị ban đầu
  const [initializedFor, setInitializedFor] = useState<number>();
  if (open && unit && initializedFor !== unit.id) {
    setInitializedFor(unit.id);
    setSelected(unit.engineers.map((engineer) => ({
      employeeId: engineer.employeeId,
      label: `${engineer.fullName} (${engineer.empCode})`,
    })));
  }

  const selectedIds = useMemo(() => new Set(selected.map((engineer) => engineer.employeeId)), [selected]);

  const add = (employeeId: number, label: string) => {
    if (!selectedIds.has(employeeId)) setSelected((previous) => [...previous, { employeeId, label }]);
  };

  const handleClose = () => {
    setInitializedFor(undefined);
    setKeyword('');
    onClose();
  };

  const handleSave = async () => {
    if (!unit) return;
    try {
      await saveMutation.mutateAsync({ unitId: unit.id, employeeIds: selected.map((engineer) => engineer.employeeId) });
      notify.success('Đã lưu kỹ sư phụ trách.');
      handleClose();
    } catch (error) {
      notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={unit ? `Kỹ sư phụ trách – ${unit.displayName}` : 'Kỹ sư phụ trách'}
      okText="Lưu phân công"
      cancelText="Hủy"
      onOk={handleSave}
      onCancel={handleClose}
      confirmLoading={saveMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 720 }}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col gap-4 pt-1">
        <div>
          <Typography.Text strong className="mb-2 block">
            Đang phụ trách ({selected.length})
          </Typography.Text>
          {selected.length === 0 ? (
            <Typography.Text type="secondary">Chưa có kỹ sư: không ai nhập được form của đơn vị này.</Typography.Text>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selected.map((engineer) => (
                <Tag
                  key={engineer.employeeId}
                  closable
                  color="blue"
                  onClose={() =>
                    setSelected((previous) => previous.filter((item) => item.employeeId !== engineer.employeeId))
                  }
                  className="py-1 text-sm"
                >
                  {engineer.label}
                </Tag>
              ))}
            </div>
          )}
        </div>

        <div>
          <Typography.Text strong className="mb-2 block">
            Gợi ý từ sơ đồ tổ chức
          </Typography.Text>
          {suggestionsQuery.isLoading ? (
            <Spin />
          ) : suggestionsQuery.isError ? (
            <Alert type="error" showIcon title="Không tải được gợi ý" description={String(suggestionsQuery.error.message)} />
          ) : (suggestionsQuery.data ?? []).length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có kỹ sư (cấp KS) ở tổ/kíp hoặc đội trên sơ đồ" />
          ) : (
            <List
              size="small"
              bordered
              dataSource={suggestionsQuery.data ?? []}
              renderItem={(suggestion) => {
                const label = `${suggestion.fullName} (${suggestion.empCode})`;
                const isSelected = selectedIds.has(suggestion.employeeId);
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="add"
                        size="small"
                        type={isSelected ? 'text' : 'default'}
                        icon={isSelected ? <CheckOutlined /> : <PlusOutlined />}
                        disabled={isSelected}
                        onClick={() => add(suggestion.employeeId, label)}
                      >
                        {isSelected ? 'Đã chọn' : 'Chọn'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={label}
                      description={`${suggestion.levelName} · ${suggestion.orgUnitName}`}
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        <div>
          <Typography.Text strong className="mb-2 block">
            Tìm người khác trong xưởng
          </Typography.Text>
          <Select
            showSearch
            value={null}
            searchValue={keyword}
            onSearch={setKeyword}
            filterOption={false}
            placeholder="Gõ họ tên hoặc mã nhân viên…"
            aria-label="Tìm kỹ sư trong xưởng"
            loading={searchQuery.isFetching}
            notFoundContent={debouncedKeyword ? 'Không tìm thấy' : 'Gõ để tìm'}
            className="w-full"
            options={(debouncedKeyword ? (searchQuery.data ?? []) : []).map((option) => ({
              value: option.employeeId,
              label: `${option.fullName} (${option.empCode}) · ${option.levelName} · ${option.orgUnitName}`,
              disabled: selectedIds.has(option.employeeId),
            }))}
            onSelect={(employeeId: number | null) => {
              const option = searchQuery.data?.find((item) => item.employeeId === employeeId);
              if (option) add(option.employeeId, `${option.fullName} (${option.empCode})`);
              setKeyword('');
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
