import { RightOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

interface CollapseToggleProps {
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Nút thu gọn / mở rộng dòng tiêu đề nhóm (bấm vào mũi tên hoặc tên); mũi tên xoay mượt. */
export const CollapseToggle = ({
  expanded,
  onToggle,
  children,
}: CollapseToggleProps) => (
  <button
    type="button"
    aria-expanded={expanded}
    onClick={onToggle}
    className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-inherit"
  >
    <RightOutlined
      className="text-[10px] transition-transform duration-200 motion-reduce:transition-none"
      style={{ transform: expanded ? "rotate(90deg)" : undefined }}
    />
    {children}
  </button>
);
