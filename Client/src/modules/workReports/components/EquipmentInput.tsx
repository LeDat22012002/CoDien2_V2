import { AutoComplete } from 'antd';
import { useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useEquipmentOptions } from '@/modules/workReports/hooks/useWorkReportQueries';

const SEARCH_DEBOUNCE_MS = 300;

interface EquipmentInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  onPressEnter?: () => void;
}

/**
 * Ô Equipment: gõ để tìm trong danh mục thiết bị (mã hoặc tên) hoặc gõ tự do.
 * Server tự gắn thiết bị khi mã có trong danh mục.
 */
export const EquipmentInput = ({ value, onChange, onPressEnter }: EquipmentInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const keyword = useDebouncedValue((value ?? '').trim(), SEARCH_DEBOUNCE_MS);
  const optionsQuery = useEquipmentOptions(keyword, isFocused && keyword.length >= 2);

  return (
    <AutoComplete
      value={value ?? ''}
      onChange={(next) => onChange?.(next)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.defaultPrevented) onPressEnter?.();
      }}
      placeholder="Mã thiết bị"
      aria-label="Equipment"
      allowClear
      className="w-full font-mono"
      options={(optionsQuery.data ?? []).map((equipment) => ({
        value: equipment.code,
        label: equipment.name ? `${equipment.code} – ${equipment.name}` : equipment.code,
      }))}
    />
  );
};
