'use client';

import CustomHeading from '@/lib/components/CustomHeading';
import CustomText from '@/lib/components/CustomText';
import CustomInput from '@/lib/components/CustomInput';
import CustomButton from '@/lib/components/CustomButton';
import { useAppSelector } from '@/lib/hook';
import { useState } from 'react';

const BusinessDetails = () => {
  const { user } = useAppSelector((state) => state.user);
  const [businessName, setBusinessName] = useState(
    (user as { businessName?: string })?.businessName || ''
  );
  const [businessEmail, setBusinessEmail] = useState(
    (user as { businessEmail?: string })?.businessEmail || ''
  );
  const [businessAddress, setBusinessAddress] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');

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
        />
        <CustomInput
          id="bd-businessEmail"
          label="Business email"
          value={businessEmail}
          onChange={setBusinessEmail}
          placeholder="business@company.com"
          type="email"
          required
        />
        <CustomInput
          id="bd-rcNumber"
          label="RC Number"
          value={rcNumber}
          onChange={setRcNumber}
          placeholder="Enter RC number"
          required
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <CustomInput
            id="bd-businessType"
            label="Business type"
            value={businessType}
            onChange={setBusinessType}
            placeholder="e.g. Limited Liability"
            required
          />
          <CustomInput
            id="bd-industry"
            label="Industry"
            value={industry}
            onChange={setIndustry}
            placeholder="e.g. Technology"
            required
          />
        </div>
        <CustomInput
          id="bd-address"
          label="Business address"
          value={businessAddress}
          onChange={setBusinessAddress}
          placeholder="Enter your business address"
          required
        />
      </div>

      <CustomButton text="Save & Continue" />
    </section>
  );
};

export default BusinessDetails;
