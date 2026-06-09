import React from 'react';

interface SidebarButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: string;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, isActive, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left h-[40px] px-[20px] flex items-center rounded-full text-[14px] font-medium tracking-[-0.01em] transition-all duration-200
        ${isActive
          ? 'bg-[#F5F5F5] text-gray-900'
          : 'text-[#5C5C5C] hover:bg-[#F5F5F5] hover:text-gray-800'}
      `}
    >
      {icon && <span className="material-symbols-outlined mr-3 text-[20px]">{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default SidebarButton;
