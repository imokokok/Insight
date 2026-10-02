import { CreditCard, Database, KeyRound, SlidersHorizontal, UserRound } from 'lucide-react';

export const settingsSections = [
  {
    id: 'profile',
    label: 'Profile',
    icon: UserRound,
    navDescription: 'Identity & security',
    title: 'Make this space yours.',
    description: 'Keep your identity, verified email, and password in clear view.',
    detail: 'Your account identity',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: SlidersHorizontal,
    navDescription: 'Your default view',
    title: 'Set the signal you want to see.',
    description:
      'Choose the providers, pairs, time ranges, and refresh rhythm that suit your work.',
    detail: 'Your daily defaults',
  },
  {
    id: 'data',
    label: 'Data',
    icon: Database,
    navDescription: 'Export & retention',
    title: 'Keep a clear line to your data.',
    description: 'Export your records, manage local data, and decide what stays with your account.',
    detail: 'Your records and history',
  },
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: KeyRound,
    navDescription: 'Scoped access',
    title: 'Give every key a purpose.',
    description: 'Manage credentials and inspect the access you give to each integration.',
    detail: 'Your integration access',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    navDescription: 'Credits & usage',
    title: 'Know the cost of access.',
    description: 'Review your plan, credit capacity, and usage from one accountable place.',
    detail: 'Your plan and capacity',
  },
] as const;

export type SettingsTab = (typeof settingsSections)[number]['id'];

export function getSettingsSection(tab: SettingsTab) {
  return settingsSections.find((section) => section.id === tab) ?? settingsSections[0];
}
