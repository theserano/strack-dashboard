import logo from '@/assets/logo.svg';
import Image from 'next/image';

export const Logo = () => {
  return (
    <div className="w-[32px] h-[20px] flex items-center gap-1">
      <Image src={logo} alt="logo" />
      <h3 className="color-[#0E121B] font-bold text-3xl mb-1">strack</h3>
    </div>
  );
};
