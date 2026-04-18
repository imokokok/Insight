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
  href?: string; // If the group can be clicked directly
}

export type NavStructure = (NavItem | NavGroup)[];

interface DropdownMenuProps {
  group: NavGroup;
  isActive: boolean;
  onItemClick?: () => void;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navStructure: NavStructure;
  currentPath: string;
}

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}
