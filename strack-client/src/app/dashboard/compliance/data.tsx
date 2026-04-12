import { BreadcrumbData } from '@/lib/components/BreadCrumbSelector';
import PersonalInformation from './components/PersonalInformation';
import BusinessDetails from './components/BusinessDetails';
import BusinessDocuments from './components/BusinessDocuments';
import Summary from './components/Summary';

export const breadCrumbsData: BreadcrumbData[] = [
  {
    id: 1,
    label: 'Personal Information',
    details: <PersonalInformation />,
  },
  {
    id: 2,
    label: 'Business Details',
    details: <BusinessDetails />,
  },
  {
    id: 3,
    label: 'Business Documents',
    details: <BusinessDocuments />,
  },
  {
    id: 4,
    label: 'Summary',
    details: <Summary />,
  },
];
