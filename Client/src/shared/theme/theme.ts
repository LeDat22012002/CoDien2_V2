import type { ThemeConfig } from 'antd';

/**
 * Nguồn duy nhất cho màu, font, bo góc. AntD đọc qua THEME_CONFIG; Tailwind đọc qua biến CSS
 * do applyThemeCssVariables() ghi lên :root (khai báo ở src/index.css). Xem docs/design-system.md.
 */

export const COLORS = {
  primary: '#1E40AF',
  info: '#2563EB',
  accent: '#D97706',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  text: '#0F172A',
  textSecondary: '#475569',
  border: '#94A3B8',
  borderSecondary: '#E2E8F0',
  bgLayout: '#F1F5F9',
  bgContainer: '#FFFFFF',
  sider: '#FFFFFF',
  siderItem: '#334155',
  siderItemHover: '#F1F5F9',
  siderItemSelected: '#EFF6FF',
  /** Tiêu đề nhóm menu: #64748B trên nền trắng đạt tương phản 4.7:1. */
  siderGroupTitle: '#64748B',
  tableHeader: '#F8FAFC',
} as const;

export const FONT_FAMILY = "'Fira Sans', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const BORDER_RADIUS = 6;
export const HEADER_HEIGHT = 56;
export const SIDER_WIDTH = 240;

export const THEME_CONFIG: ThemeConfig = {
  token: {
    colorPrimary: COLORS.primary,
    colorInfo: COLORS.info,
    colorSuccess: COLORS.success,
    colorWarning: COLORS.warning,
    colorError: COLORS.error,
    colorText: COLORS.text,
    colorTextSecondary: COLORS.textSecondary,
    colorBorder: COLORS.border,
    colorBorderSecondary: COLORS.borderSecondary,
    colorBgLayout: COLORS.bgLayout,
    colorBgContainer: COLORS.bgContainer,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    borderRadius: BORDER_RADIUS,
    // Chiều cao chung của Input, Select, DatePicker, Button…: 32px khi dùng chuột,
    // 40px trên màn hình cảm ứng (App.tsx chuyển componentSize="large"). Không đặt height riêng trong component.
    controlHeight: 32,
    controlHeightLG: 40,
    motionDurationMid: '0.2s',
  },
  components: {
    Layout: {
      siderBg: COLORS.sider,
      headerBg: COLORS.bgContainer,
      headerHeight: HEADER_HEIGHT,
      headerPadding: '0 16px',
    },
    Menu: {
      itemHeight: 44,
    },
    Table: {
      headerBg: COLORS.tableHeader,
    },
  },
};

/** Token riêng của menu Sider (bọc ConfigProvider trong AppMenu), không ảnh hưởng menu header trang công khai. */
export const SIDER_MENU_THEME: ThemeConfig = {
  components: {
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: COLORS.siderItem,
      itemHoverColor: COLORS.text,
      itemHoverBg: COLORS.siderItemHover,
      itemActiveBg: COLORS.siderItemSelected,
      itemSelectedBg: COLORS.siderItemSelected,
      itemSelectedColor: COLORS.primary,
      groupTitleColor: COLORS.siderGroupTitle,
      groupTitleFontSize: 11,
      groupTitleLineHeight: 1.5,
      itemMarginInline: 8,
      itemMarginBlock: 2,
      itemBorderRadius: 6,
      iconSize: 16,
      iconMarginInlineEnd: 12,
      activeBarBorderWidth: 0,
      collapsedIconSize: 18,
    },
  },
};

const CSS_VARIABLES: Record<string, string> = {
  '--app-color-primary': COLORS.primary,
  '--app-color-accent': COLORS.accent,
  '--app-color-success': COLORS.success,
  '--app-color-warning': COLORS.warning,
  '--app-color-error': COLORS.error,
  '--app-color-text': COLORS.text,
  '--app-color-text-secondary': COLORS.textSecondary,
  '--app-color-border': COLORS.borderSecondary,
  '--app-color-bg-layout': COLORS.bgLayout,
  '--app-color-bg-container': COLORS.bgContainer,
  '--app-color-sider': COLORS.sider,
  '--app-font-family': FONT_FAMILY,
  '--app-radius': `${BORDER_RADIUS}px`,
};

export const applyThemeCssVariables = () => {
  const rootStyle = document.documentElement.style;
  Object.entries(CSS_VARIABLES).forEach(([name, value]) => rootStyle.setProperty(name, value));
};
