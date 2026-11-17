import { AutoComplete } from "antd";
import { useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
  useLookupMaterialByCode,
  useMaterialOptions,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type { MaterialOption } from "@/modules/workReports/types/workReports";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_KEYWORD_LENGTH = 2;

/** Cách tìm ra vật tư: chọn trong danh sách gợi ý, hay gõ đúng mã rồi rời ô. */
export type MaterialMatchSource = "select" | "typed";

interface MaterialCodeInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  /** Mã có trong danh mục: material = vật tư khớp. Gõ mã không có trong danh mục: material = null. */
  onMaterialMatch?: (
    material: MaterialOption | null,
    source: MaterialMatchSource,
  ) => void;
}

const formatLabel = (material: MaterialOption) =>
  [
    material.code,
    material.description,
    material.uom ? `(${material.uom})` : null,
    material.plant ? `· ${material.plant}` : null,
  ]
    .filter(Boolean)
    .join(" ");

/**
 * Ô Mã vật tư: gõ để tìm trong danh mục vật tư (mã hoặc tên) hoặc gõ tự do.
 * - Chọn gợi ý → báo vật tư đã chọn (form tự điền tên, ĐVT).
 * - Gõ tay rồi rời ô → tra đúng mã; có thì báo vật tư, không có thì báo null (vẫn nhập bình thường).
 */
export const MaterialCodeInput = ({
  value,
  onChange,
  onMaterialMatch,
}: MaterialCodeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [lastMatchedCode, setLastMatchedCode] = useState<string>();
  const keyword = useDebouncedValue((value ?? "").trim(), SEARCH_DEBOUNCE_MS);
  const optionsQuery = useMaterialOptions(
    keyword,
    isFocused && keyword.length >= MIN_KEYWORD_LENGTH,
  );
  const lookupByCode = useLookupMaterialByCode();
  const options = optionsQuery.data ?? [];

  const handleSelect = (_: string, option: { material: MaterialOption }) => {
    setLastMatchedCode(option.material.code);
    onMaterialMatch?.(option.material, "select");
  };

  const handleBlur = async () => {
    setIsFocused(false);
    const code = (value ?? "").trim();
    // Vừa chọn gợi ý hoặc đã tra mã này rồi thì không tra lại
    if (!code || code === lastMatchedCode) return;
    setLastMatchedCode(code);
    try {
      onMaterialMatch?.(await lookupByCode(code), "typed");
    } catch {
      // Lỗi mạng khi tra mã: bỏ qua, người dùng vẫn nhập tay được
    }
  };

  return (
    <AutoComplete
      value={value ?? ""}
      onChange={(next) => onChange?.(next)}
      onSelect={handleSelect}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      placeholder="Gõ mã hoặc tên để tìm"
      aria-label="Mã vật tư"
      allowClear
      className="w-full font-mono"
      notFoundContent={
        isFocused &&
        keyword.length >= MIN_KEYWORD_LENGTH &&
        !optionsQuery.isFetching
          ? "Không có trong danh mục – vẫn nhập tự do được"
          : undefined
      }
      options={options.map((material) => ({
        key: material.id,
        value: material.code,
        label: formatLabel(material),
        material,
      }))}
    />
  );
};
