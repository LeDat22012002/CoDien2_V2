import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Col, Form, Input, Modal, Row, Select, Spin, TreeSelect } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/shared/api/axiosClient';
import { PositionCard } from '@/shared/components/PositionCard';
import { CHANGE_TYPE_OPTIONS } from '@/shared/constants/organization';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  useActiveEmployeeSearch,
  useChangeAssignment,
  useEmployeeAssignments,
  useEndAssignment,
  useUnitMembers,
} from '@/shared/hooks/useOrgStructure';
import type {
  AssignableEmployee,
  ChangeAssignmentRequest,
  OrgUnit,
  OrgUnitType,
  PositionLevel,
} from '@/shared/types/organization';
import {
  getAllowedLevelCodes,
  getHeadLevel,
  getPrimaryAssignment,
  suggestChangeType,
  suggestJobTitle,
} from '@/shared/utils/assignmentRules';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT, toIsoDate } from '@/shared/utils/format';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { buildUnitTree, renderUnitTreeTitle } from '@/shared/utils/orgUnitTree';

const EMPLOYEE_SEARCH_DEBOUNCE_MS = 400;

interface AssignmentFormValues {
  newOrgUnitCode?: string;
  newLevelCode?: string;
  changeType?: ChangeAssignmentRequest['changeType'];
  isActing?: boolean;
  jobTitle?: string;
  decisionNo?: string;
  note?: string;
}

interface AssignmentChangeModalProps {
  open: boolean;
  /** Truyền vào thì khóa ô chọn nhân viên; bỏ trống thì cho tìm nhân viên đang làm việc. */
  employee?: AssignableEmployee | null;
  /** Đơn vị điền sẵn (vd mở từ trang cơ cấu tổ chức). */
  defaultUnitCode?: string;
  /** Đơn vị đang hoạt động. */
  units: OrgUnit[];
  levels: PositionLevel[];
  unitTypes: OrgUnitType[];
  onClose: () => void;
}

/**
 * Điều chỉnh vị trí: bổ nhiệm / lên cấp / xuống cấp / điều chuyển / giao quyền.
 * Có hiệu lực ngay khi lưu (ngày hiệu lực = hôm nay). Không kiêm nhiệm: vị trí cũ được đóng.
 * Dùng chung cho trang Nhân viên và trang Cơ cấu tổ chức.
 */
export const AssignmentChangeModal = ({
  open,
  employee,
  defaultUnitCode,
  units,
  levels,
  unitTypes,
  onClose,
}: AssignmentChangeModalProps) => {
  const [form] = Form.useForm<AssignmentFormValues>();
  const [pickedEmployee, setPickedEmployee] = useState<AssignableEmployee | null>(null);
  const [employeeKeyword, setEmployeeKeyword] = useState('');
  const [isReplacingHead, setIsReplacingHead] = useState(false);
  const [error, setError] = useState('');
  // Người dùng đã tự sửa thì thôi tự gợi ý loại thay đổi / chức danh
  const touched = useRef({ changeType: false, jobTitle: false });

  const target = employee ?? pickedEmployee;
  const debouncedKeyword = useDebouncedValue(employeeKeyword.trim(), EMPLOYEE_SEARCH_DEBOUNCE_MS);
  const searchQuery = useActiveEmployeeSearch(debouncedKeyword, open && !employee);
  const assignmentsQuery = useEmployeeAssignments(open ? target?.id : undefined);
  const current = getPrimaryAssignment(assignmentsQuery.data);

  const changeMutation = useChangeAssignment();
  const endMutation = useEndAssignment();
  const isSaving = changeMutation.isPending || endMutation.isPending;

  const unitCode = Form.useWatch('newOrgUnitCode', form);
  const levelCode = Form.useWatch('newLevelCode', form);
  const isActing = Boolean(Form.useWatch('isActing', form));
  const jobTitle = Form.useWatch('jobTitle', form);

  const unitsByCode = useMemo(() => new Map(units.map((unit) => [unit.code, unit])), [units]);
  const unitsById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const unitTree = useMemo(() => buildUnitTree(units, 'code'), [units]);
  const unit = unitCode ? unitsByCode.get(unitCode) : undefined;
  const level = levels.find((item) => item.code === levelCode);

  const levelOptions = useMemo(() => {
    const allowed = getAllowedLevelCodes(unit);
    return [...levels]
      .filter((item) => !allowed || allowed.includes(item.code))
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({ value: item.code, label: item.name }));
  }, [levels, unit]);

  // Đơn vị → người đang giữ (để biết trưởng hiện tại)
  const membersQuery = useUnitMembers(open ? unit?.id : undefined);

  const employeeOptions = useMemo(() => {
    if (employee) return [{ value: employee.id, label: `${employee.fullName} · ${employee.empCode}`, description: '' }];
    return (searchQuery.data?.items ?? []).map((item) => {
      const position = getPrimaryAssignment(item.currentAssignments);
      return {
        value: item.id,
        label: `${item.fullName} · ${item.empCode}`,
        description: position ? `${position.levelName} · ${position.orgUnitName}` : 'Chưa xếp vị trí',
      };
    });
  }, [employee, searchQuery.data]);

  // ----- Mở modal -----
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ newOrgUnitCode: defaultUnitCode, isActing: false });
    touched.current = { changeType: false, jobTitle: false };
  }, [open, defaultUnitCode, form]);

  const handleClose = () => {
    setPickedEmployee(null);
    setEmployeeKeyword('');
    setIsReplacingHead(false);
    setError('');
    onClose();
  };

  const handleValuesChange = (changedValues: AssignmentFormValues) => {
    if (error) setError('');
    // Đổi đơn vị / cấp bậc thì bỏ lựa chọn cho trưởng cũ thôi giữ chức
    if ('newOrgUnitCode' in changedValues || 'newLevelCode' in changedValues) setIsReplacingHead(false);
  };

  const handleEmployeeChange = (employeeId?: number) => {
    const picked = searchQuery.data?.items.find((item) => item.id === employeeId);
    setPickedEmployee(picked ? { id: picked.id, empCode: picked.empCode, fullName: picked.fullName } : null);
    setError('');
  };

  // Đổi đơn vị mà cấp bậc không còn hợp lệ → bỏ chọn cấp bậc
  useEffect(() => {
    if (levelCode && !levelOptions.some((option) => option.value === levelCode)) {
      form.setFieldValue('newLevelCode', undefined);
    }
  }, [levelOptions, levelCode, form]);

  // Tự gợi ý loại thay đổi + chức danh (khi người dùng chưa tự sửa)
  useEffect(() => {
    if (!levelCode) return;
    if (!touched.current.changeType) {
      form.setFieldValue('changeType', suggestChangeType(current, levelCode, isActing, levels));
    }
    if (!touched.current.jobTitle) {
      form.setFieldValue('jobTitle', suggestJobTitle(unit, level, unitsById, isActing));
    }
  }, [levelCode, unit, level, isActing, current, levels, unitsById, form]);

  // ----- Trưởng đơn vị đang có -----
  const headLevel = getHeadLevel(unit, unitTypes);
  const conflictHeads = useMemo(() => {
    if (!unit || !levelCode || isActing || !headLevel.isSingleHead || levelCode !== headLevel.code) return [];
    return (membersQuery.data ?? []).filter(
      (member) => member.unitRole === 'HEAD' && !member.isActing && member.empCode !== target?.empCode,
    );
  }, [unit, levelCode, isActing, headLevel.isSingleHead, headLevel.code, membersQuery.data, target?.empCode]);

  // ----- Lưu -----
  const isSameAsCurrent =
    current &&
    unit &&
    current.orgUnitCode === unit.code &&
    current.levelCode === levelCode &&
    current.isActing === isActing &&
    (current.jobTitle ?? '') === (jobTitle ?? '').trim();

  const handleSubmit = async () => {
    let values: AssignmentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!target) {
      setError('Chọn nhân viên.');
      return;
    }
    if (isSameAsCurrent) {
      setError('Vị trí mới giống hệt vị trí hiện tại.');
      return;
    }
    if (conflictHeads.length > 0 && !isReplacingHead) {
      setError(`Đơn vị đã có ${level?.name} chính thức. Chọn "Cho thôi giữ chức" hoặc tick "Giao quyền".`);
      return;
    }

    setError('');
    const today = toIsoDate(dayjs()) ?? '';
    try {
      // 1. Cho trưởng cũ thôi giữ chức (nếu người dùng chọn)
      if (isReplacingHead) {
        for (const head of conflictHeads) {
          try {
            await endMutation.mutateAsync({
              assignmentId: head.assignmentId,
              request: { endDate: today, note: `Thôi giữ chức để bổ nhiệm ${target.fullName}` },
            });
          } catch (endError) {
            throw new Error(`Không cho ${head.fullName} thôi giữ chức được: ${getErrorMessage(endError)}`);
          }
        }
      }

      // 2. Điều chỉnh vị trí
      try {
        await changeMutation.mutateAsync({
          empCode: target.empCode,
          newOrgUnitCode: values.newOrgUnitCode ?? '',
          newLevelCode: values.newLevelCode ?? '',
          effectiveDate: today,
          changeType: values.changeType ?? 'TRANSFER',
          jobTitle: values.jobTitle,
          isActing: Boolean(values.isActing),
          decisionNo: values.decisionNo,
          note: values.note,
        });
      } catch (changeError) {
        if (applyServerErrors(form, changeError)) return;
        const message = getErrorMessage(changeError);
        throw new Error(isReplacingHead ? `Đã cho trưởng cũ thôi giữ chức, nhưng điều chỉnh lỗi: ${message}` : message);
      }

      notify.success('Cập nhật chức vụ thành công.');
      handleClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  const conflictHead = conflictHeads[0];

  return (
    <Modal
      open={open}
      title="Điều chỉnh vị trí"
      okText="Lưu"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={isSaving}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 720 }}
      centered
      destroyOnHidden
    >
      <div className="mb-3 text-sm text-text-secondary">
        Có hiệu lực ngay khi lưu (ngày {dayjs().format(DATE_FORMAT)}). Vị trí cũ được đóng và lưu vào lịch sử.
      </div>
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}

      <Form<AssignmentFormValues> form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Form.Item label="Nhân viên" required>
          <Select<number>
            showSearch={{ filterOption: false, onSearch: setEmployeeKeyword }}
            value={target?.id}
            disabled={Boolean(employee)}
            placeholder="Gõ mã NV hoặc họ tên…"
            notFoundContent={searchQuery.isFetching ? <Spin size="small" /> : 'Không tìm thấy'}
            options={employeeOptions}
            optionRender={(option) => (
              <div className="leading-tight">
                <div>{option.data.label}</div>
                {option.data.description && (
                  <div className="text-sm text-text-secondary">{option.data.description}</div>
                )}
              </div>
            )}
            onChange={handleEmployeeChange}
          />
        </Form.Item>

        {/* Trước → Sau */}
        <Spin spinning={assignmentsQuery.isFetching}>
          <div className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row">
            <PositionCard
              label="Hiện tại"
              emptyText={!target ? 'Chưa chọn nhân viên' : current ? null : 'Chưa xếp vị trí'}
              levelCode={current?.levelCode}
              levelName={current?.levelName}
              unitName={current?.orgUnitName}
              jobTitle={current?.jobTitle}
              isActing={current?.isActing}
            />
            <ArrowRightOutlined className="self-center rotate-90 text-text-secondary sm:rotate-0" aria-hidden />
            <PositionCard
              label="Sau khi lưu"
              isHighlighted
              emptyText={!unit || !level ? 'Chọn đơn vị và cấp bậc' : null}
              levelCode={level?.code}
              levelName={level?.name}
              unitName={unit?.name}
              jobTitle={jobTitle}
              isActing={isActing}
            />
          </div>
        </Spin>

        <Row gutter={12}>
          <Col xs={24} md={14}>
            <Form.Item name="newOrgUnitCode" label="Đơn vị mới" rules={[{ required: true, message: 'Chọn đơn vị' }]}>
              <TreeSelect
                showSearch
                treeData={unitTree}
                treeNodeFilterProp="searchText"
                treeDefaultExpandedKeys={unitTree.map((node) => node.value)}
                placeholder="Chọn Xưởng / Đội / Tổ…"
                listHeight={360}
                treeTitleRender={renderUnitTreeTitle}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name="newLevelCode"
              label="Cấp bậc mới"
              rules={[{ required: true, message: 'Chọn cấp bậc' }]}
              extra={unit ? `Các cấp hợp lệ cho ${unit.name}` : undefined}
            >
              <Select
                options={levelOptions}
                placeholder={unit ? 'Chọn cấp bậc' : 'Chọn đơn vị trước'}
                disabled={!unit}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Trưởng đơn vị đang có */}
        {unit && conflictHead && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            title={`${unit.name} đang có ${level?.name}: ${conflictHeads
              .map((head) => `${head.fullName} (${head.empCode})`)
              .join(', ')}`}
            description={
              <div className="flex flex-col gap-2">
                <div>Mỗi đơn vị chỉ có 1 {level?.name.toLowerCase()} chính thức. Chọn 1 cách:</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type={isReplacingHead ? 'primary' : 'default'}
                    icon={isReplacingHead ? <CheckOutlined /> : undefined}
                    onClick={() => {
                      setIsReplacingHead((previous) => !previous);
                      setError('');
                    }}
                  >
                    Cho {conflictHead.fullName} thôi giữ chức khi lưu
                  </Button>
                  <Button onClick={() => form.setFieldValue('isActing', true)}>Chuyển thành giao quyền</Button>
                </div>
                {isReplacingHead && (
                  <div className="text-sm text-text-secondary">
                    Người cũ sẽ thành "Chưa xếp vị trí", nhớ điều chuyển họ sang vị trí mới sau.
                  </div>
                )}
              </div>
            }
          />
        )}

        <Row gutter={12}>
          <Col xs={24} md={10}>
            <Form.Item name="changeType" label="Loại thay đổi" rules={[{ required: true, message: 'Chọn loại thay đổi' }]}>
              <Select
                options={CHANGE_TYPE_OPTIONS}
                placeholder="Tự gợi ý theo vị trí"
                onChange={(value) => {
                  touched.current.changeType = true;
                  if (value === 'ACTING') form.setFieldValue('isActing', true);
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item name="isActing" label=" " valuePropName="checked">
              <Checkbox
                onChange={(event) => {
                  if (!event.target.checked && form.getFieldValue('changeType') === 'ACTING') {
                    touched.current.changeType = false;
                  }
                }}
              >
                Giao quyền (Quyền {level?.name.toLowerCase() ?? '…'})
              </Checkbox>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="jobTitle"
              label="Chức danh"
              rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
              extra="Tự gợi ý theo đơn vị và cấp bậc, sửa lại cho đúng quyết định nếu cần."
            >
              <Input
                onChange={() => {
                  touched.current.jobTitle = true;
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="decisionNo" label="Số quyết định" rules={[{ max: 100, message: 'Tối đa 100 ký tự' }]}>
              <Input placeholder="VD: 123/QĐ-HPDQ" />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item name="note" label="Ghi chú" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
              <Input placeholder="Lý do điều chỉnh…" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
