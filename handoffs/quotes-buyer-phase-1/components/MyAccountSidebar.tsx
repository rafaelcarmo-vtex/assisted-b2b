import React from 'react';

interface NavItem {
  label: string;
  count?: number;
}

interface MyAccountSidebarProps {
  contractName: string;
  contractInitial?: string;
  activeItem?: string;
  onSelectItem?: (item: string) => void;
  onSwitch?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Profile' },
  { label: 'Orders', count: 8 },
  { label: 'Quotes', count: 28 },
  { label: 'User details' },
  { label: 'Security' },
];

const MyAccountSidebar: React.FC<MyAccountSidebarProps> = ({
  contractName,
  contractInitial = 'S',
  activeItem = 'Quotes',
  onSelectItem,
  onSwitch,
}) => {
  return (
    <aside className="w-[320px] shrink-0">
      <div className="flex flex-col gap-1">
        <div className="w-[60px] h-[60px] rounded-full bg-black text-white flex items-center justify-center text-[20px] font-semibold">
          {contractInitial.toUpperCase()}
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[20px] font-semibold text-gray-900 tracking-[-0.04em] leading-[1.04] truncate">
            {contractName}
          </span>
          <button
            type="button"
            onClick={onSwitch}
            className="h-[40px] pl-[18px] pr-[20px] rounded-full text-[#0366DD] font-medium border border-[#E0E0E0] bg-white transition-all duration-300 hover:bg-[#F5F5F5] outline-none shrink-0"
          >
            <span className="text-[14px] tracking-[-0.01em]">Change</span>
          </button>
        </div>
      </div>

      <nav className="mt-8 -ml-4 flex flex-col">
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === activeItem;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectItem?.(item.label)}
              className={`w-full h-[40px] px-4 flex items-center justify-start rounded-full transition-colors duration-200 ${
                isActive ? 'bg-[#F5F5F5]' : 'hover:bg-[#F5F5F5]'
              }`}
            >
              <span className="flex items-center gap-1 text-[14px] leading-5 tracking-[-0.01em] text-black">
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="text-[#858585]">{item.count}</span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default MyAccountSidebar;
