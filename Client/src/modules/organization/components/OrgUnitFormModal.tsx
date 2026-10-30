import { Alert, Col, Form, Input, Modal, Row, Select, Tag, TreeSelect } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '@/shared/api/axiosClient';
import { UNIT_TYPE_META } from '@/shared/constants/organization';
import type { LookupItem, OrgUnit, OrgUnitType, OrgUnitTypeCode, PositionLevel } from '@/shared/types/organization';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { buildUnitTree, groupChildren, renderUnitTreeTitle } from '@/shared/utils/orgUnitTree';
import { DISCIPLINE_UNIT_TYPES, SHIFT_OPTIONS } from '@/modules/organization/constants/organization';
import { useCreateOrgUnit, useUpdateOrgUnit } from '@/modules/organization/hooks/useOrganizationQueries';
import {
  getAllowedChildTypes,
  getDescendantIds,
  suggestUnitCode,
  suggestUnitName,
} from '@/modules/organization/utils/orgUnitRules';

interface OrgUnitFormValues {
  typeCode?: OrgUnitTypeCode;
  code?: string;
  name?: string;
  shortName?: string;
  parentId?: number;
  headLevelCode?: string;
  disciplineCode?: string;
  area?: string;
  shift?: string;
  note?: string;
}

export type OrgUnitFormMode = 'create' | 'update';

interface OrgUnitFormModalProps {
  open: boolean;
  mode: OrgUnitFormMode;
  /** Đơn vị đang sửa (update). */
  unit?: OrgUnit;
  /** Đơn vị cha cố định (create = đơn vị đang chọn). */
  parent?: OrgUnit;
  /** Loại đơn vị con chọn sẵn (create). */
  defaultTypeCode?: OrgUnitTypeCode;
  /** Mọi đơn vị kể cả đã xóa (để mã không trùng). */
  units: OrgUnit[];
  unitTypes: OrgUnitType[];
  levels: PositionLevel[];
  disciplines: LookupItem[];
  onClose: () => void;
  onSaved: (saved: OrgUnit) => void;
}

/**
 * Thêm / sửa đơn vị (giống hệ thống cũ):
 * - Thêm: cha cố định (đơn vị đang chọn), chọn loại con hợp lệ, mã tự gợi ý, thứ tự = cuối danh sách.
 * - Sửa: không đổi được mã + loại; đổi được đơn vị cha (chỉ cha hợp lệ, không chọn nhánh con của chính nó).
 *   PUT ghi đè toàn bộ nên luôn gửi đủ các trường.
 */
export const OrgUnitFormModal = ({
  open,
  mode,
  unit,
  parent,
  defaultTypeCode,
  units,
  unitTypes,
  levels,
  disciplines,
  onClose,
  onSaved,
}: OrgUnitFormModalProps) => {
  const [form] = Form.useForm<OrgUnitFormValues>();
  const [error, setError] = useState('');
  // Người dùng đã tự sửa thì thôi tự gợi ý mã / tên
  const touched = useRef({ code: false, name: false });
  const isCreate = mode === 'create';

  const createMutation = useCreateOrgUnit();
  const updateMutation = useUpdateOrgUnit();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const typeCode = Form.useWatch('typeCode', form);
  const disciplineCode = Form.useWatch('disciplineCode', form);
  const parentId = Form.useWatch('parentId', form);

  const childrenMap = useMemo(() => groupChildren(units), [units]);
  const unitsById = useMemo(() => new Map(units.map((item) => [item.id, item])), [units]);
  const allCodes = useMemo(() => units.map((item) => item.code), [units]);
  const currentParent = isCreate ? parent : parentId !== undefined ? unitsById.get(parentId) : undefined;
  const effectiveType = isCreate ? typeCode : unit?.typeCode;

  const typeOptions = useMemo(
    () =>
      (parent ? getAllowedChildTypes(parent.typeCode, unitTypes) : []).map((code) => ({
        value: code,
        label: unitTypes.find((type) => type.code === code)?.name ?? code,
      })),
    [parent, unitTypes],
  );

  // Chọn đơn vị cha khi sửa: chỉ loại cha hợp lệ, bỏ chính nó + nhánh con của nó
  const parentTree = useMemo(() => {
    if (isCreate || !unit) return [];
    const allowedParents = unitTypes.find((type) => type.code === unit.typeCode)?.allowedParentTypes ?? [];
    const blockedIds = getDescendantIds(unit.id, childrenMap);
    return buildUnitTree(units, 'id', {
      isExcluded: (item) => blockedIds.has(item.id),
      isDisabled: (item) => !allowedParents.includes(item.typeCode),
    });
  }, [isCreate, unit, unitTypes, childrenMap, units]);

  const defaultHeadLevelCode = unitTypes.find((type) => type.code === effectiveType)?.headLevelCode;
  const defaultHeadName = levels.find((level) => level.code === defaultHeadLevelCode)?.name;
  const showDiscipline = Boolean(effectiveType && DISCIPLINE_UNIT_TYPES.includes(effectiveType));
  const showShift = effectiveType === 'GROUP' && currentParent?.typeCode === 'SHIFT';

  // ----- Mở modal -----
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    touched.current = { code: false, name: false };
    if (isCreate) {
      const presetType = typeOptions.some((option) => option.value === defaultTypeCode) ? defaultTypeCode : undefined;
      form.setFieldsValue({
        typeCode: presetType ?? (typeOptions.length === 1 ? typeOptions[0].value : undefined),
        // Tổ / Ca kế thừa chuyên môn của đơn vị cha
        disciplineCode: parent?.disciplineCode ?? undefined,
      });
    } else if (unit) {
      form.setFieldsValue({
        typeCode: unit.typeCode,
        code: unit.code,
        name: unit.name,
        shortName: unit.shortName ?? undefined,
        parentId: unit.parentId ?? undefined,
        headLevelCode: unit.headLevelCode ?? undefined,
        disciplineCode: unit.disciplineCode ?? undefined,
        area: unit.area ?? undefined,
        shift: unit.shift ?? undefined,
        note: unit.note ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ điền lại khi mở modal
  }, [open]);

  // Gợi ý mã + tên khi chọn loại / chuyên môn (nếu người dùng chưa tự sửa)
  useEffect(() => {
    if (!open || !isCreate || !typeCode) return;
    if (!touched.current.code) form.setFieldValue('code', suggestUnitCode(parent, typeCode, allCodes));
    if (!touched.current.name) {
      const disciplineName = disciplines.find((item) => item.code === disciplineCode)?.name;
      form.setFieldValue('name', suggestUnitName(typeCode, disciplineName));
    }
  }, [open, isCreate, typeCode, disciplineCode, parent, allCodes, disciplines, form]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    let values: OrgUnitFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const common = {
      name: values.name?.trim() ?? '',
      shortName: values.shortName,
      headLevelCode: values.headLevelCode,
      disciplineCode: showDiscipline ? values.disciplineCode : undefined,
      area: values.area,
      shift: showShift ? values.shift : undefined,
      note: values.note,
    };

    setError('');
    try {
      let saved: OrgUnit;
      if (isCreate) {
        if (!parent || !values.typeCode) return;
        saved = await createMutation.mutateAsync({
          ...common,
          code: values.code?.trim() ?? '',
          typeCode: values.typeCode,
          parentId: parent.id,
          // Thêm vào cuối danh sách con
          sortOrder: (childrenMap.get(parent.id)?.length ?? 0) + 1,
        });
        notify.success('Thêm đơn vị thành công.');
      } else {
        if (!unit) return;
        const nextParentId = unit.parentId == null ? null : (values.parentId ?? null);
        saved = await updateMutation.mutateAsync({
          id: unit.id,
          request: {
            ...common,
            parentId: nextParentId,
            // Đổi cha → xếp cuối danh sách cha mới; giữ cha → giữ thứ tự
            sortOrder:
              nextParentId !== unit.parentId && nextParentId !== null
                ? (childrenMap.get(nextParentId)?.length ?? 0) + 1
                : unit.sortOrder,
          },
        });
        notify.success('Cập nhật đơn vị thành công.');
      }
      setError('');
      onSaved(saved);
    } catch (saveError) {
      if (!applyServerErrors(form, saveError)) setError(getErrorMessage(saveError));
    }
  };

  const typeMeta = unit ? UNIT_TYPE_META[unit.typeCode] : undefined;
  const title = isCreate ? (
    <span>
      Thêm đơn vị con của <b>{parent?.name}</b>
    </span>
  ) : (
    <span>
      Sửa đơn vị <Tag color={typeMeta?.color}>{typeMeta?.label}</Tag>
    </span>
  );

  return (
    <Modal
      open={open}
      title={title}
      okText={isCreate ? 'Thêm mới' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={isSaving}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 680 }}
      centered
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      {isCreate && parent && typeOptions.length === 0 && (
        <Alert
          type="info"
          showIcon
          title={`Không thể thêm đơn vị con dưới loại "${UNIT_TYPE_META[parent.typeCode]?.label}".`}
          className="mb-3"
        />
      )}

      <Form<OrgUnitFormValues> form={form} layout="vertical" onValuesChange={() => error && setError('')}>
        <Row gutter={12}>
          <Col xs={24} md={10}>
            <Form.Item name="typeCode" label="Loại đơn vị" rules={[{ required: true, message: 'Chọn loại đơn vị' }]}>
              <Select
                options={
                  isCreate
                    ? typeOptions
                    : [{ value: unit?.typeCode, label: unitTypes.find((type) => type.code === unit?.typeCode)?.name }]
                }
                disabled={!isCreate}
                placeholder="Chọn loại"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item
              name="code"
              label="Mã đơn vị"
              rules={[
                { required: true, whitespace: true, message: 'Nhập mã đơn vị' },
                { max: 50, message: 'Tối đa 50 ký tự' },
                {
                  validator: (_, value?: string) =>
                    isCreate && value && allCodes.includes(value.trim())
                      ? Promise.reject(new Error('Mã đã tồn tại (kể cả đơn vị đã xóa)'))
                      : Promise.resolve(),
                },
              ]}
              extra={isCreate ? 'Tự sinh theo quy tắc, sửa được. Sau khi tạo không đổi được.' : 'Không đổi được mã.'}
            >
              <Input
                disabled={!isCreate}
                placeholder="VD: X.CĐLG1-D06"
                onChange={() => {
                  touched.current.code = true;
                }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={16}>
            <Form.Item
              name="name"
              label="Tên đơn vị"
              rules={[
                { required: true, whitespace: true, message: 'Nhập tên đơn vị' },
                { max: 255, message: 'Tối đa 255 ký tự' },
              ]}
              extra={
                effectiveType === 'TEAM'
                  ? 'Đặt theo mẫu "Đội Cơ khí - …" / "Đội Điện - …" để sơ đồ ghi đúng nhãn Kỹ sư.'
                  : undefined
              }
            >
              <Input
                onChange={() => {
                  touched.current.name = true;
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="shortName" label="Tên ngắn" rules={[{ max: 100, message: 'Tối đa 100 ký tự' }]}>
              <Input placeholder="Không bắt buộc" />
            </Form.Item>
          </Col>

          {!isCreate && unit?.parentId != null && (
            <Col span={24}>
              <Form.Item
                name="parentId"
                label="Đơn vị cha"
                rules={[{ required: true, message: 'Chọn đơn vị cha' }]}
                extra="Chuyển sang đơn vị cha khác: toàn bộ đơn vị con và nhân sự đi theo."
              >
                <TreeSelect
                  showSearch
                  treeData={parentTree}
                  treeNodeFilterProp="searchText"
                  treeDefaultExpandAll
                  listHeight={360}
                  treeTitleRender={renderUnitTreeTitle}
                />
              </Form.Item>
            </Col>
          )}

          {showDiscipline && (
            <Col xs={24} md={8}>
              <Form.Item name="disciplineCode" label="Chuyên môn">
                <Select
                  allowClear
                  placeholder="Chọn"
                  options={disciplines.map((item) => ({ value: item.code, label: item.name }))}
                />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} md={showShift ? 10 : showDiscipline ? 16 : 24}>
            <Form.Item name="area" label="Khu vực phụ trách" rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}>
              <Input placeholder="VD: Lò cao 1, 2" />
            </Form.Item>
          </Col>
          {showShift && (
            <Col xs={24} md={6}>
              <Form.Item name="shift" label="Kíp">
                <Select allowClear options={SHIFT_OPTIONS} placeholder="Chọn" />
              </Form.Item>
            </Col>
          )}

          <Col xs={24} md={12}>
            <Form.Item
              name="headLevelCode"
              label="Cấp trưởng đơn vị"
              extra="Chỉ đổi khi đơn vị dùng cấp trưởng khác loại (vd Kho dùng Thủ kho). Cấp trưởng quyết định hàng hiển thị."
            >
              <Select
                allowClear
                placeholder={`Theo loại đơn vị: ${defaultHeadName ?? '—'}`}
                options={levels.map((level) => ({ value: level.code, label: `${level.name} (hàng ${level.chartRow})` }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="note" label="Ghi chú" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
