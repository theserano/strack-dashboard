import { BreadcrumbData } from '@/lib/components/BreadCrumbSelector';
import PersonalInformation from './components/PersonalInformation';

export const breadCrumbsData: BreadcrumbData[] = [
  {
    id: 1,
    label: 'Personal Information',
    details: <PersonalInformation />,
  },
  {
    id: 2,
    label: 'Business Details',
    details: <div>Details about business information.</div>,
  },
  {
    id: 3,
    label: 'Business Documents',
    details: <div>Details about business documents.</div>,
  },
  {
    id: 4,
    label: 'Summary',
    details: <div>Summary of the account creation process.</div>,
  },
];
