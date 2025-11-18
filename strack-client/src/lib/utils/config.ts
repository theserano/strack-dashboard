import {
  ShieldCheck,
  Users,
  Settings,
  Headphones,
  Activity,
  ArrowRightLeft,
  ChartColumnStacked,
  BanknoteArrowDown,
  LayoutGrid,
  NotepadTextDashed,
} from 'lucide-react';

type NavItem = {
    name: string;
    href: string;
    icon: React.ElementType;
};

export const mainNav: NavItem[] = [
  { name: 'Compliance', href: '/dashboard/compliance', icon: NotepadTextDashed },
  { name: 'Dashboard', href: '/dashboard/user', icon: LayoutGrid },
  { name: 'Transaction', href: '/dashboard/transaction', icon: ArrowRightLeft },
  { name: 'Payment', href: '/dashboard/payment', icon: ChartColumnStacked },
  { name: 'Payout', href: '/dashboard/payout', icon: BanknoteArrowDown },
  { name: 'Customer', href: '/dashboard/customer', icon: Users },
  { name: 'Activity Log', href: '/dashboard/activity', icon: Activity },
];

export const otherNav: NavItem[] = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Support', href: '/dashboard/support', icon: Headphones },
];
