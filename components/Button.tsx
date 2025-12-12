import React from 'react';
import { PALETTE } from '../constants';
import { ButtonProps } from '../types';

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: `text-white hover:bg-[#34495E] shadow-lg shadow-[#2C3E50]/20`,
    outline: `border text-[${PALETTE.primary}] hover:bg-[${PALETTE.primary}] hover:text-white`,
    ghost: `text-[${PALETTE.secondary}] hover:bg-white/50 hover:text-[${PALETTE.primary}]`,
    gold: `bg-[${PALETTE.accent}] text-white hover:opacity-90 shadow-lg shadow-[${PALETTE.accent}]/20`
  };

  const getStyle = () => {
    if (variant === 'primary') return { backgroundColor: PALETTE.primary };
    if (variant === 'outline') return { borderColor: PALETTE.primary };
    return {};
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={getStyle()}
    >
      {children}
    </button>
  );
};

export default Button;