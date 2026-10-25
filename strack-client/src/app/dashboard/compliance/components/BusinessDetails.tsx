'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import CustomButton from '@/lib/components/CustomButton';
import CustomSelect from '@/lib/components/CustomSelect';
import { showToast } from '@/lib/utils/plainFunctions';
import { useEffect, useState } from 'react';
import { useSaveStep } from '../useSaveStep';
import { BUSINESS_TYPES, INDUSTRIES, OTHER, splitChoice } from '../options';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BusinessDetails = () => {
  const { user, save, saving, locked } = useSaveStep();
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [businessEmail, setBusinessEmail] = useState(user?.businessEmail || '');
  const [businessAddress, setBusinessAddress] = useState(user?.businessAddress || '');
  const [rcNumber, setRcNumber] = useState(user?.rcNumber || '');
  // Dropdown choice, plus free text when "Other" is picked.
  const [businessType, setBusinessType] = useState(splitChoice(user?.businessType, BUSINESS_TYPES));
  const [industry, setIndustry] = useState(splitChoice(user?.industry, INDUSTRIES));
  const [submitted, setSubmitted] = useState(false);

  // Fill in saved values once the user loads (e.g. after a page reload).
  useEffect(() => {
    if (!user) return;
    setBusinessName((v) => v || user.businessName || '');
    setBusinessEmail((v) => v || user.businessEmail || '');
    setBusinessAddress((v) => v || user.businessAddress || '');
    setRcNumber((v) => v || user.rcNumber || '');
    setBusinessType((v) => (v.choice ? v : splitChoice(user.businessType, BUSINESS_TYPES)));
    setIndustry((v) => (v.choice ? v : splitChoice(user.industry, INDUSTRIES)));
  }, [user]);

  const resolve = (v: { choice: string; other: string }) =>
    v.choice === OTHER ? v.other.trim() : v.choice;
  const businessTypeValue = resolve(businessType);
  const industryValue = resolve(industry);

  const errors = {
    businessName: !businessName.trim(),
    businessEmail: !EMAIL_REGEX.test(businessEmail.trim()),
    rcNumber: !rcNumber.trim(),
    businessType: !businessTypeValue,
    industry: !industryValue,
    businessAddress: !businessAddress.trim(),
  };

  const handleSave = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) {
      showToast({ message: 'Error', description: 'Please fill in all fields correctly.' });
      return;
    }
    save({
      businessName: businessName.trim(),
      businessEmail: businessEmail.trim(),
      rcNumber: rcNumber.trim(),
      businessType: businessTypeValue,
      industry: industryValue,
      businessAddress: businessAddress.trim(),
    });
  };

  return (
    <section className="max-w-[600px] flex flex-col mt-8 gap-8">
      <header>
        <CustomHeading type="h1" value="Business Details" className="text-center" />
        <CustomText
          type="sm"
          value="Provide your business information for verification purposes."
          className="text-center"
        />
      </header>

      <div className="flex flex-col gap-5">
        <CustomInput
          id="bd-businessName"
          label="Business name"
          value={businessName}
          onChange={setBusinessName}
          placeholder="Enter your business name"
          required
          error={submitted && errors.businessName}
        />
        <CustomInput
          id="bd-businessEmail"
          label="Business email"
          value={businessEmail}
          onChange={setBusinessEmail}
          placeholder="business@company.com"
          type="email"
          required
          error={submitted && errors.businessEmail}
        />
        <CustomInput
          id="bd-rcNumber"
          label="RC Number"
          value={rcNumber}
          onChange={setRcNumber}
          placeholder="Enter RC number"
          required
          error={submitted && errors.rcNumber}
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex w-full flex-col gap-3">
            <CustomSelect
              id="bd-businessType"
              label="Business type"
              value={businessType.choice}
              options={BUSINESS_TYPES}
              onChange={(choice) => setBusinessType((v) => ({ ...v, choice }))}
              placeholder="Select business type"
              required
              error={submitted && !businessType.choice}
            />
            {businessType.choice === OTHER && (
              <CustomInput
                id="bd-businessType-other"
                value={businessType.other}
                onChange={(other) => setBusinessType((v) => ({ ...v, other }))}
                placeholder="Enter your business type"
                error={submitted && errors.businessType}
              />
            )}
          </div>
          <div className="flex w-full flex-col gap-3">
            <CustomSelect
              id="bd-industry"
              label="Industry"
              value={industry.choice}
              options={INDUSTRIES}
              onChange={(choice) => setIndustry((v) => ({ ...v, choice }))}
              placeholder="Select industry"
              required
              error={submitted && !industry.choice}
            />
            {industry.choice === OTHER && (
              <CustomInput
                id="bd-industry-other"
                value={industry.other}
                onChange={(other) => setIndustry((v) => ({ ...v, other }))}
                placeholder="Enter your industry"
                error={submitted && errors.industry}
              />
            )}
          </div>
        </div>
        <CustomInput
          id="bd-address"
          label="Business address"
          value={businessAddress}
          onChange={setBusinessAddress}
          placeholder="Enter your business address"
          required
          error={submitted && errors.businessAddress}
        />
      </div>

      <CustomButton
        text={locked ? 'Submitted for review' : 'Save & Continue'}
        onClick={handleSave}
        isLoading={saving}
        disabled={saving || locked}
      />
    </section>
  );
};

export default BusinessDetails;
