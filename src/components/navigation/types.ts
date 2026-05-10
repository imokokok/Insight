import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  badge?: string;
  highlight?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  href?: string;
  megaMenu?: boolean;
}

export type NavStructure = (NavItem | NavGroup)[];
