import React, { useState } from 'react';

interface StorefrontHeaderProps {
  contractName: string;
  contractInitial?: string;
  onContractClick?: () => void;
  onLogoClick?: () => void;
  onCartClick?: () => void;
  initialSearchQuery?: string;
}

const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  contractName,
  contractInitial,
  onContractClick,
  onLogoClick,
  onCartClick,
  initialSearchQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const initial = (contractInitial ?? contractName.charAt(0)).toUpperCase();

  return (
    <div className="shrink-0 bg-white border-b border-[#EBEBEB]">
      <header className="relative h-[60px] flex items-center justify-between px-[40px] shrink-0 bg-white z-10">
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onLogoClick}
            className="font-bold text-[20px] text-[#0366DD] tracking-[-0.04em] select-none bg-transparent border-none p-0 cursor-pointer"
          >
            Demostore
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 w-[calc(33.333%-40px)]">
          <div className="relative w-full">
            <div className="flex items-center h-[40px] px-4 rounded-full bg-[#F5F5F5] focus-within:bg-white focus-within:border-[#0366DD] border border-transparent transition-all">
              <span className="material-symbols-outlined text-[20px] text-gray-900 mr-3 select-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-[#5C5C5C]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-500 transition-colors"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onContractClick}
            className="h-[40px] pl-[6px] pr-[16px] rounded-full border border-[#e3e3e3] flex items-center justify-start gap-2 hover:bg-[#F5F5F5] transition-colors"
          >
            <div className="w-[28px] h-[28px] bg-black text-white rounded-full flex items-center justify-center text-[11px] font-bold">{initial}</div>
            <span className="text-[14px] font-semibold text-gray-800 tracking-tight">{contractName}</span>
          </button>

          <button
            onClick={onCartClick}
            className="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px] text-gray-800">trolley</span>
          </button>
        </div>
      </header>

      <div className="h-[60px] px-[40px] flex items-center justify-between text-[14px] font-medium tracking-[-0.01em]">
        <nav className="flex items-center gap-5 text-[#1F1F1F] text-[14px] font-medium tracking-[-0.01em]">
          <button className="flex items-center gap-0.5 hover:opacity-80 transition-opacity">
            <span>All categories</span>
            <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
          </button>
          <button className="hover:opacity-80 transition-opacity">Deals</button>
          <button className="hover:opacity-80 transition-opacity">Best Sellers</button>
        </nav>
        <div className="flex items-center gap-4 text-[14px] font-medium tracking-[-0.01em] text-[#7A7A7A]">
          <div>
            <span>Ship to: </span>
            <button className="text-[#0366DD] font-medium tracking-[-0.01em] hover:underline">Boston Boylston St, 02116</button>
          </div>
          <div>
            <span>Delivery method: </span>
            <button className="text-[#0366DD] font-medium tracking-[-0.01em] hover:underline">Standard Shipping</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontHeader;
