import React from 'react';

type Props = {
  value: string;
  type: 'sm' | 'md' | 'lg' | 'xl';
  styleProps?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
};

const CustomText = ({ value, type, styleProps, onClick, className }: Props) => {
  return (
    <>
      {type === 'sm' && (
        <p onClick={onClick} style={styleProps} className={`text-[#525866] text-sm ${className}`}>
          {value}
        </p>
      )}
      {type === 'md' && (
        <p onClick={onClick} style={styleProps} className={`text-[#525866] text-base ${className}`}>
          {value}
        </p>
      )}
      {type === 'lg' && (
        <p onClick={onClick} style={styleProps} className={`text-[#525866] text-lg ${className}`}>
          {value}
        </p>
      )}
      {type === 'xl' && (
        <p onClick={onClick} style={styleProps} className={`text-[#525866] text-xl ${className}`}>
          {value}
        </p>
      )}
    </>
  );
};

export default CustomText;
