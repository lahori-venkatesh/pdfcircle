import React, { StrictMode, ReactNode } from 'react';

interface StrictModeWrapperProps {
  children: ReactNode;
  enabled?: boolean;
}

export const StrictModeWrapper: React.FC<StrictModeWrapperProps> = ({ 
  children, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  if (enabled) {
    return <StrictMode>{children}</StrictMode>;
  }
  
  return <>{children}</>;
};
