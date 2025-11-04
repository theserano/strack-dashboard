'use client';
import { Logo } from '@/lib/components/Logo';
import Image from 'next/image';
import React from 'react';
import WhiteSpiral from '@/assets/white-spiral.svg';
import SignupAutoSlider from './signup-auto-slider';
import CustomText from '@/lib/components/CustomText';
import AccountSelectionForm from './components/AccountSelectionForm';
import useCreateAccountModel from './model/useCreateAccountModel';
import CreateIndividualAccountForm from './components/CreateIndividualAccountForm';
import CreateBusinessAccountForm from './components/CreateBusinessAccountForm';

const CreateAccount = () => {
  const { activeCard, setActiveCard, step, setStep } = useCreateAccountModel();

  return (
    <main className="grid grid-cols-[4fr_7fr] h-screen">
      <section className="bg-[#F7F9FC] w-full h-full p-6 relative flex flex-col justify-between">
        <Logo />
        <Image src={WhiteSpiral} alt="White Spiral" className="absolute bottom-0 right-0 top-0" />
        <SignupAutoSlider />
      </section>

      <section className="w-full h-full flex flex-col items-center justify-center">
        {step === 0 ? (
          <AccountSelectionForm
            activeCard={activeCard}
            setActiveCard={setActiveCard}
            setStep={setStep}
          />
        ) : step === 1 ? (
          <>
            {activeCard === 'individual' ? (
              <CreateIndividualAccountForm setStep={setStep} />
            ) : (
              <CreateBusinessAccountForm setStep={setStep} />
            )}
          </>
        ) : null}
        {/* already have an account ---- text */}
        <span className="mt-1 flex gap-0.5 items-center">
          <CustomText
            type="md"
            value="Already have an account?"
            styleProps={{ color: '#667185' }}
          />

          <CustomText
            type="md"
            value="Login here"
            styleProps={{ color: '#667185', cursor: 'pointer' }}
          />
        </span>
      </section>
    </main>
  );
};

export default CreateAccount;
