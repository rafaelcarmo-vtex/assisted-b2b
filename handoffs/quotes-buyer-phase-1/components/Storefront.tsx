import React, { useEffect, useState } from 'react';
import ContractAccountDrawer from './ContractAccountDrawer';
import StorefrontHeader from './StorefrontHeader';
import LoadingBar from './LoadingBar';
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

const Storefront: React.FC<StorefrontProps> = ({ onAdminClick, onManageOrg, orgUnitName, contracts, defaultContractId }) => {
  const persistedContext = (() => {
    try {
      const raw = window.localStorage.getItem(ORDER_ENTRY_SESSION_KEY);
      return raw ? (JSON.parse(raw) as Partial<SessionContext>) : null;
    } catch {
      return null;
    }
  })();
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

  const handleQuotesClick = () => {
    handleCloseContractDrawer();
    window.location.hash = 'quotes';
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
          <StorefrontHeader
            contractName={contracts.find((c) => c.id === currentContractId)?.name ?? 'Stellar Global'}
            contractInitial="S"
            onContractClick={() => setIsContractDrawerOpen(true)}
          />

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
              className="group absolute right-[32px] bottom-[32px] h-[56px] w-[56px] hover:w-[164px] rounded-full bg-[#0366DD] text-white shadow-[0_6px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_7px_16px_rgba(0,0,0,0.32)] active:scale-[0.99] transition-[width,box-shadow,transform] duration-260 ease-in overflow-hidden flex items-center justify-center"
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
            onQuotesClick={handleQuotesClick}
          />
        </div>
      )}
    </div>
  );
};

export default Storefront;
