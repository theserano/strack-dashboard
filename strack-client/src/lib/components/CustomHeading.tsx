import React from 'react';

type Props = {
  value: string;
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
  styleProps?: React.CSSProperties;
};

const CustomHeading = ({ value, type, styleProps }: Props) => {
  return (
    <>
      {type === 'h1' && (
        <h1 style={styleProps} className="text-[#101928] text-4xl">
          {value}
        </h1>
      )}
      {type === 'h2' && (
        <h2 style={styleProps} className="text-[#101928] text-3xl">
          {value}
        </h2>
      )}
      {type === 'h3' && (
        <h3 style={styleProps} className="text-[#101928] text-2xl">
          {value}
        </h3>
      )}
      {type === 'h4' && (
        <h4 style={styleProps} className="text-[#101928] text-xl">
          {value}
        </h4>
      )}
      {type === 'h5' && (
        <h5 style={styleProps} className="text-[#101928] text-lg">
          {value}
        </h5>
      )}
    </>
  );
};

export default CustomHeading;
