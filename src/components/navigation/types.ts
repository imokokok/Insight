import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  href?: string; // 如果可以直接点击分组
}

export type NavStructure = (NavItem | NavGroup)[];

export interface DropdownMenuProps {
  group: NavGroup;
  isActive: boolean;
  onItemClick?: () => void;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navStructure: NavStructure;
  currentPath: string;
}

export interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}
