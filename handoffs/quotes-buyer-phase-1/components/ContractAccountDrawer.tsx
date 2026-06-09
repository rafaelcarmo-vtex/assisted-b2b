import React, { useEffect, useMemo, useRef, useState } from 'react';
import SidebarButton from './SidebarButton';
import { Contract } from '../types';

interface ContractAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contractName: string;
  orgUnitName: string;
  userName: string;
  userEmail: string;
  onManageOrg: () => void;
  onChangeContract: () => void;
  isDefault: boolean;
  isChangeView: boolean;
  onBackFromChange: () => void;
  currentContractId: string;
  defaultContractId: string;
  contracts: Contract[];
  onConfirmContract: (contract: Contract) => void;
  onQuotesClick?: () => void;
}

const menuItems = [
  'Profile',
  'Orders',
  'Quotes',
  'Addresses',
  'User details',
  'Authentication',
] as const;

const ContractAccountDrawer: React.FC<ContractAccountDrawerProps> = ({
  isOpen,
  onClose,
  contractName,
  orgUnitName,
  userName,
  userEmail,
  onManageOrg,
  onChangeContract,
  isDefault,
  isChangeView,
  onBackFromChange,
  currentContractId,
  defaultContractId,
  contracts,
  onConfirmContract,
  onQuotesClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeItem, setActiveItem] = useState<(typeof menuItems)[number]>('Profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(25);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastLoadedFrom, setLastLoadedFrom] = useState(25);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const animationDuration = 550;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsAnimating(true), 20);
      return () => clearTimeout(timer);
    }
    setIsAnimating(false);
    const timer = setTimeout(() => setIsVisible(false), animationDuration);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isChangeView) {
      setSearchQuery('');
      setSelectedId(null);
    }
  }, [isChangeView]);

  const currentContract = useMemo(
    () => contracts.find((c) => c.id === currentContractId) ?? contracts[0],
    [contracts, currentContractId]
  );

  const filteredContracts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return contracts;
    return contracts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contracts, searchQuery]);

  const availableContracts = useMemo(
    () => filteredContracts.filter((c) => c.id !== currentContractId),
    [filteredContracts, currentContractId]
  );

  const orderedContracts = useMemo(() => {
    return [...availableContracts].sort((a, b) => {
      if (a.id === defaultContractId) return -1;
      if (b.id === defaultContractId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [availableContracts, defaultContractId]);

  const visibleContracts = useMemo(
    () => orderedContracts.slice(0, visibleCount),
    [orderedContracts, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(25);
    setLastLoadedFrom(25);
    setIsLoadingMore(false);
  }, [searchQuery, contracts, currentContractId]);

  useEffect(() => {
    if (!isChangeView) return;
    if (visibleCount >= orderedContracts.length) return;
    if (!sentinelRef.current || !scrollRef.current) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          const currentCount = visibleCount;
          const nextCount = Math.min(currentCount + 25, orderedContracts.length);
          setTimeout(() => {
            setLastLoadedFrom(currentCount);
            setVisibleCount(nextCount);
            setIsLoadingMore(false);
          }, 1200);
        }
      },
      { root, rootMargin: '80px', threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [orderedContracts.length, isChangeView, isLoadingMore, visibleCount]);

  const canConfirm = selectedId !== null && selectedId !== currentContractId;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-500 ease-linear ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`
          relative h-full w-1/3 min-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden
          transition-transform ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ transitionDuration: `${animationDuration}ms` }}
      >
        <div
          className={`
            flex w-[200%] h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${isChangeView ? '-translate-x-1/2' : 'translate-x-0'}
          `}
        >
          <div className="w-1/2 h-full relative">
            <div
              className="absolute inset-x-0 top-0 h-[100px] z-0"
              style={{
                background: 'linear-gradient(180deg, #EEEEF7 0%, rgba(238, 238, 247, 0.5) 100%)',
              }}
            />
            <div className="h-[60px] pl-[40px] pr-[10px] flex items-center justify-end shrink-0 relative z-10">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100 text-gray-600"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto relative z-10">
              <div className="flex flex-col px-[40px] pt-[10px] pb-[220px]">
                <div className="flex flex-col">
                  <div className="w-[60px] h-[60px] rounded-full bg-black text-white flex items-center justify-center text-[20px] font-semibold">
                    {contractName.charAt(0).toUpperCase()}
                  </div>

                  <div className="mt-[8px] flex items-center justify-between w-full">
                    <div className="text-[20px] font-semibold text-gray-900 tracking-[-0.04em] leading-[1.04]">
                      {contractName}
                    </div>

                    <div className="flex items-center gap-[20px]">
                      {isDefault && (
                        <span className="material-symbols-outlined text-[#0366DD] text-[20px] material-symbols-filled">star</span>
                      )}
                      <button
                        onClick={onChangeContract}
                        className="h-[40px] pl-[18px] pr-[20px] rounded-full text-[#0366DD] font-medium border border-[#E0E0E0] transition-all duration-300 hover:bg-[#F5F5F5] outline-none"
                      >
                        <span className="text-[14px] tracking-[-0.01em]">Change</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-[20px] -mx-[20px] flex flex-col gap-[2px]">
                  {menuItems.map((item) => (
                    <SidebarButton
                      key={item}
                      label={item}
                      isActive={false}
                      onClick={() => {
                        setActiveItem(item);
                        if (item === 'Quotes' && onQuotesClick) {
                          onQuotesClick();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute left-[40px] right-[40px] bottom-[40px] z-10">
              <div className="rounded-[4px] border border-[#e3e3e3] overflow-hidden bg-white">
                <div className="flex items-center justify-between px-[20px] py-[20px] border-b border-[#e3e3e3]">
                  <div className="flex items-center gap-2 text-[14px] font-medium tracking-[-0.01em] text-gray-900 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-[#0366DD] material-symbols-filled shrink-0">folder</span>
                    <span className="truncate">{orgUnitName}</span>
                  </div>
                  <button
                    onClick={onManageOrg}
                    className="text-[14px] font-medium tracking-[-0.01em] text-[#0366DD] hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex items-center justify-between px-[20px] py-[20px]">
                  <div>
                    <div className="text-[14px] font-medium tracking-[-0.01em] text-gray-900">{userName}</div>
                    <div className="text-[14px] font-medium tracking-[-0.01em] text-gray-500">{userEmail}</div>
                  </div>
                  <button
                    title="Log out"
                    className="w-[40px] h-[40px] rounded-full flex items-center justify-center hover:bg-black/5 text-[#1F1F1F] hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-1/2 h-full flex flex-col">
            <div className="h-[60px] px-[10px] flex items-center border-b border-[#e3e3e3] shrink-0 relative">
              <h2 className="text-[20px] font-semibold text-gray-900 tracking-[-0.03em] absolute left-[40px] top-1/2 -translate-y-1/2">
                Change contract
              </h2>
              <button
                onClick={onClose}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] text-gray-600"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-[40px] pt-[40px] pb-[40px]">
              <div className="mb-[32px]">
                <div className="text-[12px] text-[#5C5C5C] mb-[8px]">Current session</div>
                {currentContract && (
                  <div className="w-full h-[56px] px-[12px] rounded-[4px] border border-[#e3e3e3] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-[28px] h-[28px] rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center">
                        {currentContract.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[14px] font-medium text-gray-900">{currentContract.name}</span>
                    </div>
                    {currentContract.id === defaultContractId && (
                      <span className="material-symbols-outlined text-[20px] text-[#0366DD] material-symbols-filled">star</span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[14px] text-gray-900 mb-[16px]">
                Select one of <span className="text-[#0366DD] font-medium">{availableContracts.length}</span> available contracts:
              </div>

              <div className="relative mb-[20px]">
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

              <div className="flex flex-col gap-2">
                {visibleContracts.map((contract, index) => {
                  const isSelected = selectedId === contract.id;
                  const isDefaultItem = contract.id === defaultContractId;
                  const isNew = index >= lastLoadedFrom;
                  return (
                    <button
                      key={contract.id}
                      onClick={() => setSelectedId(contract.id)}
                      className={`
                        w-full h-[56px] px-[12px] rounded-[4px] border text-left flex items-center gap-3 transition-colors
                        ${isSelected ? 'border-[#0366DD] bg-[#F4FAFF]' : 'border-[#e3e3e3] hover:bg-[#F5F5F5]'}
                        ${isNew ? 'animate-in fade-in duration-300' : ''}
                      `}
                    >
                      <div className="w-[28px] h-[28px] rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center">
                        {contract.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[14px] font-medium text-gray-900 flex-1">{contract.name}</span>
                      {isDefaultItem && (
                        <span className="material-symbols-outlined text-[20px] text-[#0366DD] material-symbols-filled">star</span>
                      )}
                    </button>
                  );
                })}
                {isLoadingMore && visibleContracts.length < orderedContracts.length && (
                  <>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className={`
                          w-full h-[56px] rounded-[4px] overflow-hidden
                          bg-[#F5F5F5]
                          ${idx === 0 ? 'opacity-100' : idx === 1 ? 'opacity-70' : idx === 2 ? 'opacity-40' : idx === 3 ? 'opacity-20' : 'opacity-10'}
                        `}
                      />
                    ))}
                  </>
                )}
              </div>
              {!isLoadingMore && orderedContracts.length > 0 && visibleContracts.length >= orderedContracts.length && (
                <div className="mt-[20px] text-[12px] text-[#5C5C5C] text-center">
                  All available contracts have been loaded.
                </div>
              )}
              <div ref={sentinelRef} className="h-0" />
            </div>

            <div className="h-[80px] border-t border-[#e3e3e3] px-[40px] flex items-center justify-end gap-3 shrink-0 bg-white">
              <button
                onClick={onBackFromChange}
                className="px-6 h-[40px] rounded-full text-[14px] font-semibold transition-colors text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const selected = contracts.find((c) => c.id === selectedId);
                  if (selected) onConfirmContract(selected);
                }}
                disabled={!canConfirm}
                className={`px-8 h-[40px] rounded-full text-[14px] font-semibold transition-all flex items-center justify-center gap-2 min-w-[100px] ${
                  canConfirm
                    ? 'bg-[#0366DD] text-white hover:bg-[#0255b8]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractAccountDrawer;
