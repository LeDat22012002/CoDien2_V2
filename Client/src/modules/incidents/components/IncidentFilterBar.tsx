import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import {
  AFFECTS_PRODUCTION_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  SHIFT_OPTIONS,
  STOP_LEVEL_OPTIONS,
} from '@/modules/incidents/constants/incidentOptions';
import type { IncidentWorkshop } from '@/modules/incidents/types/incidents';

/** Giá trị bộ lọc (chuỗi như trên URL); ô chữ là giá trị đang gõ, trang tự debounce. */
export interface IncidentFilterValues {
  shift?: string;
  workshopId?: number;
  equipmentCode: string;
  incidentType?: string;
  stopLevel?: string;
  affectsProduction?: string;
  keyword: string;
}

interface IncidentFilterBarProps {
  values: IncidentFilterValues;
  workshops: IncidentWorkshop[];
  isWorkshopsLoading: boolean;
  isRefreshing: boolean;
  onChange: (patch: Partial<IncidentFilterValues>) => void;
  onReset: () => void;
  onRefresh: () => void;
  onCreate: () => void;
}

const ALL_PLACEHOLDER = '-- Tất cả --';

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-semibold">
      {label}
    </label>
    {children}
  </div>
);

/**
 * Bộ lọc giống hệ thống cũ: Kíp, Xưởng, Mã Equipment, Loại sự cố, Dừng đến cấp, Ảnh hưởng SX, Tìm kiếm,
 * nút đặt lại bộ lọc và Thêm báo cáo. Màn hình nhỏ: các ô chia 2 cột.
 */
export const IncidentFilterBar = ({
  values,
  workshops,
  isWorkshopsLoading,
  isRefreshing,
  onChange,
  onReset,
  onRefresh,
  onCreate,
}: IncidentFilterBarProps) => (
  <div className="grid grid-cols-2 items-end gap-3 border border-solid border-gray-300 bg-bg-container p-4 md:grid-cols-4 xl:flex xl:flex-wrap">
    <Field label="Kíp" htmlFor="incident-shift">
      <Select
        id="incident-shift"
        allowClear
        placeholder={ALL_PLACEHOLDER}
        value={values.shift}
        onChange={(shift?: string) => onChange({ shift })}
        options={SHIFT_OPTIONS}
        className="w-full xl:w-28"
      />
    </Field>
    <Field label="Xưởng" htmlFor="incident-workshop">
      <Select
        id="incident-workshop"
        allowClear
        showSearch={{ optionFilterProp: 'label' }}
        placeholder={ALL_PLACEHOLDER}
        value={values.workshopId}
        onChange={(workshopId?: number) => onChange({ workshopId })}
        options={workshops.map((workshop) => ({ label: workshop.name, value: workshop.id }))}
        loading={isWorkshopsLoading}
        className="w-full xl:w-56"
      />
    </Field>
    <Field label="Mã Equipment" htmlFor="incident-equipment">
      <Input
        id="incident-equipment"
        allowClear
        placeholder="Nhập mã Equipment"
        value={values.equipmentCode}
        onChange={(event) => onChange({ equipmentCode: event.target.value })}
        className="w-full xl:w-44"
      />
    </Field>
    <Field label="Loại sự cố" htmlFor="incident-type">
      <Select
        id="incident-type"
        allowClear
        placeholder={ALL_PLACEHOLDER}
        value={values.incidentType}
        onChange={(incidentType?: string) => onChange({ incidentType })}
        options={INCIDENT_TYPE_OPTIONS}
        className="w-full xl:w-36"
      />
    </Field>
    <Field label="Dừng đến cấp" htmlFor="incident-stop-level">
      <Select
        id="incident-stop-level"
        allowClear
        placeholder={ALL_PLACEHOLDER}
        value={values.stopLevel}
        onChange={(stopLevel?: string) => onChange({ stopLevel })}
        options={STOP_LEVEL_OPTIONS}
        className="w-full xl:w-40"
      />
    </Field>
    <Field label="Ảnh hưởng SX" htmlFor="incident-affects-production">
      <Select
        id="incident-affects-production"
        allowClear
        placeholder={ALL_PLACEHOLDER}
        value={values.affectsProduction}
        onChange={(affectsProduction?: string) => onChange({ affectsProduction })}
        options={AFFECTS_PRODUCTION_OPTIONS}
        className="w-full xl:w-36"
      />
    </Field>
    <div className="col-span-2">
      <Field label="Tìm kiếm" htmlFor="incident-keyword">
        <Input
          id="incident-keyword"
          allowClear
          prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
          placeholder="Tên thiết bị, mô tả, phương án…"
          value={values.keyword}
          onChange={(event) => onChange({ keyword: event.target.value })}
          className="w-full xl:w-64"
        />
      </Field>
    </div>

    <div className="col-span-2 flex gap-2 md:col-span-4 xl:ml-auto">
      <Tooltip title="Đặt lại bộ lọc">
        <Button aria-label="Đặt lại bộ lọc" icon={<ReloadOutlined />} onClick={onReset} />
      </Tooltip>
      <Button onClick={onRefresh} loading={isRefreshing}>
        Tải lại
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} className="flex-1 xl:flex-none">
        Thêm báo cáo
      </Button>
    </div>
  </div>
);
