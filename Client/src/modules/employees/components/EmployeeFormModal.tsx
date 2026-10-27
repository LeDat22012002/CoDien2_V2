import { Alert, Checkbox, Col, DatePicker, Divider, Form, Input, Modal, Row, Select, Spin, Switch, TreeSelect } from 'antd';
import type { Dayjs } from 'dayjs';
import { useEffect, useMemo } from 'react';
import { getErrorMessage } from '@/shared/api/axiosClient';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT, toIsoDate } from '@/shared/utils/format';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { PositionCard } from '@/shared/components/PositionCard';
import type { OrgUnit, PositionLevel } from '@/shared/types/organization';
import { buildUnitTree, renderUnitTreeTitle } from '@/shared/utils/orgUnitTree';
import { EDUCATION_LEVEL_OPTIONS, GENDER_OPTIONS } from '@/modules/employees/constants/employeeOptions';
import {
  useCreateEmployee,
  useEmployeeDetail,
  useUpdateEmployee,
} from '@/modules/employees/hooks/useEmployeeQueries';
import type { CreateEmployeeRequest, EducationLevel, Gender } from '@/modules/employees/types/employees';

interface EmployeeFormValues {
  empCode: string;
  fullName: string;
  gender?: Gender;
  birthDate?: Dayjs | null;
  educationLevel?: EducationLevel;
  major?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  // Vị trí ban đầu (chỉ khi thêm mới)
  withAssignment?: boolean;
  orgUnitCode?: string;
  levelCode?: string;
  jobTitle?: string;
  decisionNo?: string;
  note?: string;
  isActing?: boolean;
}

const PHONE_PATTERN = /^[0-9+\s.-]{8,20}$/;

const toPersonalRequest = (values: EmployeeFormValues): Omit<CreateEmployeeRequest, 'empCode'> => ({
  fullName: values.fullName,
  gender: values.gender,
  birthDate: toIsoDate(values.birthDate),
  educationLevel: values.educationLevel,
  major: values.major,
  email: values.email,
  phone: values.phone,
});

interface EmployeeFormModalProps {
  open: boolean;
  /** undefined = thêm mới. */
  employeeId?: number;
  units: OrgUnit[];
  levels: PositionLevel[];
  /** Có quyền xếp vị trí trên sơ đồ tổ chức (assignments.manage) và đã tải được danh mục đơn vị. */
  canAssign: boolean;
  onClose: () => void;
}

/**
 * Modal thêm / sửa nhân viên (giống hệ thống cũ):
 * - Thêm mới: thông tin cá nhân + (tùy chọn) vị trí ban đầu trên sơ đồ tổ chức.
 * - Sửa: chỉ sửa thông tin cá nhân; vị trí đang giữ chỉ để xem (đổi vị trí dùng chức năng Điều chuyển).
 */
export const EmployeeFormModal = ({ open, employeeId, units, levels, canAssign, onClose }: EmployeeFormModalProps) => {
  const [form] = Form.useForm<EmployeeFormValues>();
  const isCreate = employeeId === undefined;
  const withAssignment = Form.useWatch('withAssignment', form);

  // Sửa: tải chi tiết mới nhất để điền form và xem vị trí đang giữ
  const detailQuery = useEmployeeDetail(open && !isCreate ? employeeId : undefined);
  const detail = detailQuery.data;
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const unitTree = useMemo(() => buildUnitTree(units, 'code'), [units]);
  const levelOptions = useMemo(
    () =>
      [...levels]
        .sort((a, b) => a.rank - b.rank)
        .map((level) => ({ value: level.code, label: `${level.name} (${level.code})` })),
    [levels],
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (isCreate) {
      form.setFieldsValue({ withAssignment: canAssign, isActing: false });
    } else if (detail) {
      form.setFieldsValue({
        empCode: detail.empCode,
        fullName: detail.fullName,
        gender: detail.gender ?? undefined,
        birthDate: detail.birthDate ? dayjs(detail.birthDate) : null,
        educationLevel: detail.educationLevel ?? undefined,
        major: detail.major ?? undefined,
        email: detail.email ?? undefined,
        phone: detail.phone ?? undefined,
        avatarUrl: detail.avatarUrl ?? undefined,
      });
    }
  }, [open, isCreate, detail, canAssign, form]);

  const handleSubmit = async () => {
    let values: EmployeeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // Form tự hiện lỗi dưới từng ô
    }

    try {
      if (isCreate) {
        await createMutation.mutateAsync({
          empCode: values.empCode,
          ...toPersonalRequest(values),
          initialAssignment:
            canAssign && values.withAssignment && values.orgUnitCode && values.levelCode
              ? {
                  orgUnitCode: values.orgUnitCode,
                  levelCode: values.levelCode,
                  jobTitle: values.jobTitle,
                  isActing: Boolean(values.isActing),
                  decisionNo: values.decisionNo,
                  note: values.note,
                }
              : undefined,
        });
        notify.success('Thêm nhân viên thành công.');
      } else {
        if (!detail) return;
        await updateMutation.mutateAsync({
          id: detail.id,
          request: {
            empCode: detail.empCode,
            ...toPersonalRequest(values),
            avatarUrl: values.avatarUrl,
            status: detail.status,
          },
        });
        notify.success('Cập nhật nhân viên thành công.');
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  const isLoadingDetail = !isCreate && detailQuery.isPending;

  return (
    <Modal
      open={open}
      title={isCreate ? 'Thêm nhân viên' : 'Cập nhật nhân viên'}
      okText={isCreate ? 'Thêm mới' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isSaving}
      okButtonProps={{ disabled: isLoadingDetail || (!isCreate && !detail) }}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 760 }}
      centered
      destroyOnHidden
    >
      {!isCreate && detailQuery.isError && (
        <Alert type="error" showIcon title={getErrorMessage(detailQuery.error)} className="mb-3" />
      )}

      {/* Form luôn render (để setFieldsValue khi tải xong không bị mất), chỉ phủ Spin lúc đang tải */}
      <Spin spinning={isLoadingDetail} description="Đang tải…">
        <Form<EmployeeFormValues> form={form} layout="vertical" className="pt-1" preserve={false}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="empCode"
                label="Mã nhân viên"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập mã nhân viên' },
                  { max: 20, message: 'Tối đa 20 ký tự' },
                ]}
                extra={!isCreate ? 'Không đổi được mã nhân viên' : undefined}
              >
                <Input placeholder="VD: HPDQ12345" disabled={!isCreate} autoFocus={isCreate} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item
                name="fullName"
                label="Họ và tên"
                rules={[
                  { required: true, whitespace: true, message: 'Nhập họ và tên' },
                  { max: 150, message: 'Tối đa 150 ký tự' },
                ]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>

            <Col xs={12} md={6}>
              <Form.Item name="gender" label="Giới tính">
                <Select allowClear options={GENDER_OPTIONS} placeholder="Chọn" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="birthDate" label="Ngày sinh">
                <DatePicker
                  className="w-full"
                  format={DATE_FORMAT}
                  placeholder="dd/mm/yyyy"
                  disabledDate={(date) => date.isAfter(dayjs(), 'day')}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="educationLevel" label="Trình độ">
                <Select allowClear options={EDUCATION_LEVEL_OPTIONS} placeholder="ĐH" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="major" label="Chuyên ngành" rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}>
                <Input placeholder="VD: Kỹ thuật điện" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { type: 'email', message: 'Email không hợp lệ' },
                  { max: 150, message: 'Tối đa 150 ký tự' },
                ]}
              >
                <Input placeholder="ten@hoaphat.com.vn" inputMode="email" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[{ pattern: PHONE_PATTERN, message: 'Số điện thoại không hợp lệ' }]}
              >
                <Input placeholder="09xxxxxxxx" inputMode="tel" />
              </Form.Item>
            </Col>

            {!isCreate && (
              <Col span={24}>
                <Form.Item
                  name="avatarUrl"
                  label="Ảnh đại diện (đường dẫn)"
                  rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
                >
                  <Input placeholder="https://…" />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* ----- Vị trí ----- */}
          {isCreate ? (
            canAssign && (
              <>
                <Divider titlePlacement="start" className="mt-1 mb-3">
                  <span className="mr-2 text-sm">Vị trí trên sơ đồ tổ chức</span>
                  <Form.Item name="withAssignment" valuePropName="checked" noStyle>
                    <Switch size="small" aria-label="Xếp vị trí trên sơ đồ tổ chức" />
                  </Form.Item>
                </Divider>

                {withAssignment && (
                  <Row gutter={12}>
                    <Col xs={24} md={14}>
                      <Form.Item
                        name="orgUnitCode"
                        label="Đơn vị"
                        rules={[{ required: true, message: 'Chọn đơn vị' }]}
                      >
                        <TreeSelect
                          showSearch
                          treeData={unitTree}
                          treeNodeFilterProp="searchText"
                          treeDefaultExpandedKeys={unitTree.map((node) => node.value)}
                          placeholder="Chọn Xưởng / Đội / Tổ…"
                          popupMatchSelectWidth={false}
                          listHeight={360}
                          treeTitleRender={renderUnitTreeTitle}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item
                        name="levelCode"
                        label="Cấp bậc"
                        rules={[{ required: true, message: 'Chọn cấp bậc' }]}
                      >
                        <Select showSearch optionFilterProp="label" options={levelOptions} placeholder="Chọn cấp bậc" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="jobTitle"
                        label="Chức danh"
                        rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
                        extra="Ghi đầy đủ như trong quyết định, vd: Kỹ sư Điện - Lò cao 5 - Xưởng Cơ điện Luyện gang 2"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item name="decisionNo" label="Số quyết định" rules={[{ max: 100, message: 'Tối đa 100 ký tự' }]}>
                        <Input placeholder="VD: 123/QĐ-HPDQ" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="isActing" label=" " valuePropName="checked">
                        <Checkbox>Giao quyền</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="note" label="Ghi chú" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
                        <Input.TextArea rows={2} maxLength={500} placeholder="Ghi chú…" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </>
            )
          ) : (
            <>
              <Divider titlePlacement="start" className="mt-1 mb-2">
                <span className="text-sm">Vị trí đang giữ</span>
              </Divider>
              {detail?.currentAssignments?.length ? (
                <div className="flex flex-col gap-2">
                  {detail.currentAssignments.map((assignment) => (
                    <PositionCard
                      key={assignment.assignmentId}
                      levelCode={assignment.levelCode}
                      levelName={assignment.levelName}
                      unitName={assignment.orgUnitName}
                      jobTitle={assignment.jobTitle}
                      isActing={assignment.isActing}
                      isPrimary={assignment.isPrimary}
                      startDate={assignment.startDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm italic text-text-secondary">Chưa có vị trí trên sơ đồ tổ chức</div>
              )}
              <div className="mt-2 text-sm text-text-secondary">
                Đổi đơn vị / chức vụ dùng chức năng Điều chuyển để lưu lịch sử, không sửa ở đây.
              </div>
            </>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};
