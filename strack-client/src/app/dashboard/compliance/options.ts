import { SelectOption } from '@/lib/components/CustomSelect';

export const OTHER = 'Other';

const toOptions = (labels: string[]): SelectOption[] => labels.map((l) => ({ label: l, value: l }));

// CAC registration types
export const BUSINESS_TYPES = toOptions([
  'Sole Proprietorship (Business Name)',
  'Partnership',
  'Private Limited Company (Ltd)',
  'Public Limited Company (PLC)',
  'Company Limited by Guarantee',
  'Limited Liability Partnership (LLP)',
  'Limited Partnership (LP)',
  'Unlimited Company',
  'Incorporated Trustees (NGO / Association)',
  OTHER,
]);

export const INDUSTRIES = toOptions([
  'Agriculture',
  'Automotive',
  'Construction & Real Estate',
  'Education',
  'Energy, Oil & Gas',
  'Entertainment & Media',
  'Fashion & Beauty',
  'Financial Services',
  'Food & Beverage',
  'Healthcare & Pharmaceuticals',
  'Hospitality & Travel',
  'Logistics & Transportation',
  'Manufacturing',
  'Non-profit',
  'Professional Services',
  'Retail & E-commerce',
  'Technology',
  'Telecommunications',
  OTHER,
]);

/**
 * Splits a saved value into the dropdown choice and the "Other" text,
 * so values typed before the dropdowns existed still show up.
 */
export const splitChoice = (saved: string | undefined, options: SelectOption[]) => {
  if (!saved) return { choice: '', other: '' };
  return options.some((o) => o.value === saved && o.value !== OTHER)
    ? { choice: saved, other: '' }
    : { choice: OTHER, other: saved };
};
