import {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  ClusterOutlined,
  DashboardOutlined,
  FileTextOutlined,
  MenuOutlined,
  NumberOutlined,
  OrderedListOutlined,
  ProfileOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';

/**
 * Icon menu lưu trong bảng Page dưới dạng tên (vd "TeamOutlined").
 * Khai báo tường minh thay vì import cả bộ icon để không phình bundle; thêm icon mới thì bổ sung ở đây.
 */
export const MENU_ICONS: Record<string, ComponentType> = {
  AlertOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BookOutlined,
  ClusterOutlined,
  DashboardOutlined,
  FileTextOutlined,
  MenuOutlined,
  NumberOutlined,
  OrderedListOutlined,
  ProfileOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
};

export const MENU_ICON_NAMES = Object.keys(MENU_ICONS);

export const getMenuIcon = (name?: string | null) => {
  const Icon = (name && MENU_ICONS[name]) || AppstoreOutlined;
  return <Icon />;
};
