import React from 'react';
import CustomHeading from './CustomHeading';
import CustomText from './CustomText';
import { BellDot, SearchIcon } from 'lucide-react';

type Props = {
  headerText: string;
  headerDescription: string;
};

const HeaderSearch = ({ headerText, headerDescription }: Props) => {
  return (
    <section className="flex items-center justify-between py-4 border-b border-[#E1E4EA] ">
      <div className="flex flex-col flex-1 gap-1">
        <CustomHeading type="h4" value={headerText} />
        <CustomText value={headerDescription} type="sm" />
      </div>
      <div className="flex gap-6 items-center">
        <SearchIcon width={`20px`} />
        <BellDot width={`20px`} />
      </div>
    </section>
  );
};

export default HeaderSearch;
