import React from 'react';
import CustomHeading from './CustomHeading';
import CustomText from './CustomText';
import { BellDot, SearchIcon } from 'lucide-react';

type Props = {
  headerText: string;
  headerDescription: string;
  /** Shown next to the title, e.g. a status badge. */
  badge?: React.ReactNode;
};

const HeaderSearch = ({ headerText, headerDescription, badge }: Props) => {
  return (
    <section className="flex items-center justify-between py-4 border-b border-[#E1E4EA] ">
      <div className="flex flex-col flex-1 gap-1">
        <div className="flex items-center gap-3">
          <CustomHeading type="h4" value={headerText} />
          {badge}
        </div>
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
