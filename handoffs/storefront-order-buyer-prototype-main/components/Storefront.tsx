import React, { useEffect, useState } from 'react';
import ContractAccountDrawer from './ContractAccountDrawer';
import { Contract } from '../types';

const ORDER_ENTRY_SESSION_KEY = 'order-entry-session-context';

interface SessionContext {
  contractId: string;
  contractName: string;
  userHandle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userDepartment: string;
}

interface StorefrontProps {
  onAdminClick: () => void;
  onManageOrg: () => void;
  orgUnitName: string;
  contracts: Contract[];
  defaultContractId: string;
}

const LoadingBar: React.FC = () => (
  <div className="loading-bar-container animate-in fade-in duration-300">
    <div className="loading-bar-inner">
      <div className="loading-bar-piece primary"></div>
      <div className="loading-bar-piece secondary"></div>
    </div>
  </div>
);

const Storefront: React.FC<StorefrontProps> = ({ onAdminClick, onManageOrg, orgUnitName, contracts, defaultContractId }) => {
  const persistedContext = (() => {
    try {
      const raw = window.localStorage.getItem(ORDER_ENTRY_SESSION_KEY);
      return raw ? (JSON.parse(raw) as Partial<SessionContext>) : null;
    } catch {
      return null;
    }
  })();
  const [searchQuery, setSearchQuery] = useState('');
  const [isContractDrawerOpen, setIsContractDrawerOpen] = useState(false);
  const [isChangeDrawerOpen, setIsChangeDrawerOpen] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string>(persistedContext?.contractId ?? '1');
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const userContext = {
    userHandle: persistedContext?.userHandle ?? 'kdavis',
    userName: persistedContext?.userName ?? 'Kelly Davis',
    userEmail: persistedContext?.userEmail ?? 'k.davis@stellar.com',
    userPhone: persistedContext?.userPhone ?? '+1 (617) 234-5678',
    userDepartment: persistedContext?.userDepartment ?? 'Operations and facilities',
  };

  const handleCloseContractDrawer = () => {
    setIsContractDrawerOpen(false);
    setIsChangeDrawerOpen(false);
  };

  useEffect(() => {
    if (!isSessionLoading) {
      setContentKey((prev) => prev + 1);
    }
  }, [isSessionLoading, currentContractId]);

  useEffect(() => {
    const selectedContractName = contracts.find((c) => c.id === currentContractId)?.name ?? 'Stellar Global';
    const nextContext: SessionContext = {
      contractId: currentContractId,
      contractName: selectedContractName,
      userHandle: userContext.userHandle,
      userName: userContext.userName,
      userEmail: userContext.userEmail,
      userPhone: userContext.userPhone,
      userDepartment: userContext.userDepartment,
    };
    window.localStorage.setItem(ORDER_ENTRY_SESSION_KEY, JSON.stringify(nextContext));
  }, [contracts, currentContractId, userContext.userDepartment, userContext.userEmail, userContext.userHandle, userContext.userName, userContext.userPhone]);

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto relative">
      {isSessionLoading && <LoadingBar />}
      {!isSessionLoading && (
        <div key={contentKey} className="flex flex-col h-full animate-page-in">
          <div className="shrink-0 bg-white">
            <header className="relative h-[60px] flex items-center justify-between px-[40px] shrink-0 bg-white z-10">
              <div className="flex items-center shrink-0">
                <div className="font-bold text-[20px] text-[#0366DD] tracking-[-0.04em] cursor-default select-none">
                  Demostore
                </div>
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
                  onClick={() => setIsContractDrawerOpen(true)}
                  className="h-[40px] pl-[6px] pr-[16px] rounded-full border border-[#e3e3e3] flex items-center justify-start gap-2 hover:bg-[#F5F5F5] transition-colors"
                >
                  <div className="w-[28px] h-[28px] bg-black text-white rounded-full flex items-center justify-center text-[11px] font-bold">S</div>
                  <span className="text-[14px] font-semibold text-gray-800 tracking-tight">
                    {contracts.find((c) => c.id === currentContractId)?.name ?? 'Stellar Global'}
                  </span>
                </button>

                <button className="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors">
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

          <div
            className="flex-1 relative"
            style={{
              background: 'linear-gradient(180deg, #F6F6FD 0%, rgba(246, 246, 253, 0.3) 100%)',
            }}
          >
            <button
              type="button"
              aria-label="Add"
              onClick={() => {
                const orderBuilderUrl = `${window.location.origin}${window.location.pathname}#order-builder`;
                window.open(orderBuilderUrl, '_blank', 'noopener,noreferrer');
              }}
              className="group absolute right-[32px] bottom-[32px] h-[56px] w-[56px] hover:w-[164px] rounded-full bg-black text-white shadow-[0_6px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_7px_16px_rgba(0,0,0,0.32)] active:scale-[0.99] transition-[width,box-shadow,transform] duration-260 ease-in overflow-hidden flex items-center justify-center"
            >
              <span className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-140 ease-[cubic-bezier(0.4,0,1,1)]">
                <span className="material-symbols-outlined text-[28px] leading-none">add</span>
              </span>
              <span className="absolute inset-0 flex items-center justify-center gap-2 px-0 group-hover:pl-[12px] group-hover:pr-[20px] opacity-0 group-hover:opacity-100 transition-all duration-180 delay-[30ms] ease-[cubic-bezier(0,0,0.2,1)]">
                <span className="material-symbols-outlined text-[28px] leading-none shrink-0">add</span>
                <span className="text-[14px] font-medium tracking-[-0.01em] whitespace-nowrap">
                  New Order
                </span>
              </span>
            </button>
          </div>

          <ContractAccountDrawer
            isOpen={isContractDrawerOpen}
            onClose={handleCloseContractDrawer}
            onChangeContract={() => {
              setIsChangeDrawerOpen(true);
            }}
            onManageOrg={onManageOrg}
            contractName={contracts.find((c) => c.id === currentContractId)?.name ?? 'Stellar Global'}
            orgUnitName={orgUnitName}
            userName={userContext.userName}
            userEmail={userContext.userEmail}
            isDefault={currentContractId === defaultContractId}
            isChangeView={isChangeDrawerOpen}
            onBackFromChange={() => setIsChangeDrawerOpen(false)}
            currentContractId={currentContractId}
            defaultContractId={defaultContractId}
            contracts={contracts}
            onConfirmContract={(contract) => {
              handleCloseContractDrawer();
              setIsSessionLoading(true);
              setTimeout(() => {
                setCurrentContractId(contract.id);
                setIsSessionLoading(false);
              }, 900);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Storefront;
