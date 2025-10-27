import React from 'react';

type Props = {
  value: string;
  type: 'sm' | 'md' | 'lg' | 'xl';
  styleProps?: React.CSSProperties;
  onClick?: () => void;
};

const CustomText = ({ value, type, styleProps, onClick }: Props) => {
  return (
    <>
      {type === 'sm' && (
        <p onClick={onClick} style={styleProps} className="text-[#525866] text-sm">
          {value}
        </p>
      )}
      {type === 'md' && (
        <p onClick={onClick} style={styleProps} className="text-[#525866] text-base">
          {value}
        </p>
      )}
      {type === 'lg' && (
        <p onClick={onClick} style={styleProps} className="text-[#525866] text-lg">
          {value}
        </p>
      )}
      {type === 'xl' && (
        <p onClick={onClick} style={styleProps} className="text-[#525866] text-xl">
          {value}
        </p>
      )}
    </>
  );
};

export default CustomText;
