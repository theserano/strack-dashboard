import React from 'react';

type TextSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  value: string;
  type: TextSize;
  styleProps?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
};

const sizeMap: Record<TextSize, string> = {
  sm: 'text-xs md:text-sm lg:text-sm',
  md: 'text-sm md:text-base lg:text-base',
  lg: 'text-base md:text-lg lg:text-lg',
  xl: 'text-lg md:text-xl lg:text-xl',
};

const CustomText = ({ value, type, styleProps, onClick, className }: Props) => {
  return (
    <p
      onClick={onClick}
      style={styleProps}
      className={`text-[#525866] ${sizeMap[type]} ${className || ''}`}
    >
      {value}
    </p>
  );
};

export default CustomText;
