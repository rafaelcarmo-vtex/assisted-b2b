import React, { useEffect, useMemo, useState } from 'react';
import StorefrontHeader from './StorefrontHeader';
import QuotesList, { QUOTES } from './QuotesList';
import QuotesSubNav from './QuotesSubNav';
import QuotesFiltersDrawer from './QuotesFiltersDrawer';
import Pagination from './Pagination';
import MyAccountSidebar from './MyAccountSidebar';
import ContractAccountDrawer from './ContractAccountDrawer';
import LoadingBar from './LoadingBar';
import { Contract } from '../types';
import {
  EMPTY_FILTERS,
  QuotesFilters,
  applyQuoteFilters,
  countActiveFilters,
} from '../lib/quoteFilters';

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

interface QuotesPageProps {
  contracts: Contract[];
  defaultContractId: string;
  orgUnitName: string;
  onManageOrg: () => void;
}

const QuotesPage: React.FC<QuotesPageProps> = ({ contracts, defaultContractId, orgUnitName, onManageOrg }) => {
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
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string>(persistedContext?.contractId ?? '1');
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<QuotesFilters>(EMPTY_FILTERS);

  const isAnyDrawerOpen = isContractDrawerOpen || isFiltersDrawerOpen;

  const activeFilterCount = useMemo(
    () => countActiveFilters(appliedFilters),
    [appliedFilters],
  );
  const hasActiveFilters = activeFilterCount > 0;

  const filteredQuotes = useMemo(() => {
    let result = applyQuoteFilters(QUOTES, appliedFilters);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((quote) => {
        const haystack = [
          quote.number,
          quote.subtitle,
          quote.createdBy,
          quote.creationDate,
          quote.expiresLabel,
          quote.expiresValue,
          quote.status,
          quote.total,
          String(quote.items),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    return result;
  }, [appliedFilters, searchQuery]);

  const hasResults = filteredQuotes.length > 0;
  const rangeStart = hasResults ? 1 : 0;
  const rangeEnd = filteredQuotes.length;
  const total = filteredQuotes.length;

  const userContext = {
    userHandle: persistedContext?.userHandle ?? 'kdavis',
    userName: persistedContext?.userName ?? 'Kelly Davis',
    userEmail: persistedContext?.userEmail ?? 'k.davis@stellar.com',
    userPhone: persistedContext?.userPhone ?? '+1 (617) 234-5678',
    userDepartment: persistedContext?.userDepartment ?? 'Operations and facilities',
  };

  const contractName = contracts.find((c) => c.id === currentContractId)?.name ?? 'Stellar Global';
  const contractInitial = contractName.charAt(0).toUpperCase();

  const handleCloseContractDrawer = () => {
    setIsContractDrawerOpen(false);
    setIsChangeDrawerOpen(false);
  };

  const handleLogoClick = () => {
    window.location.hash = '';
  };

  const handleSwitch = () => {
    setIsContractDrawerOpen(true);
    setIsChangeDrawerOpen(true);
  };

  useEffect(() => {
    if (!isSessionLoading) {
      setContentKey((prev) => prev + 1);
    }
  }, [isSessionLoading, currentContractId]);

  useEffect(() => {
    const nextContext: SessionContext = {
      contractId: currentContractId,
      contractName,
      userHandle: userContext.userHandle,
      userName: userContext.userName,
      userEmail: userContext.userEmail,
      userPhone: userContext.userPhone,
      userDepartment: userContext.userDepartment,
    };
    window.localStorage.setItem(ORDER_ENTRY_SESSION_KEY, JSON.stringify(nextContext));
  }, [contractName, currentContractId, userContext.userDepartment, userContext.userEmail, userContext.userHandle, userContext.userName, userContext.userPhone]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      {isSessionLoading && <LoadingBar />}
      {!isSessionLoading && (
        <div key={contentKey} className="flex flex-col h-full animate-page-in overflow-hidden">
          <StorefrontHeader
            contractName={contractName}
            contractInitial={contractInitial}
            onLogoClick={handleLogoClick}
            onContractClick={() => setIsContractDrawerOpen(true)}
          />

          <div className="flex-1 flex min-h-0 pl-[40px] pr-[4px] gap-[40px] overflow-hidden">
            <div className="shrink-0 pt-[40px]">
              <MyAccountSidebar
                contractName={contractName}
                contractInitial={contractInitial}
                activeItem="Quotes"
                onSwitch={handleSwitch}
              />
            </div>
            <main className={`flex-1 min-w-0 quotes-scroll ${isAnyDrawerOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <div className="pt-[40px] pb-[120px] pr-[30px]">
                <div className="h-[60px] flex items-center justify-between">
                  <h1 className="text-[24px] leading-[28.8px] tracking-[-0.04em] font-semibold text-[#1F1F1F]">
                    Quotes
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      const newQuoteUrl = `${window.location.origin}${window.location.pathname}#order-builder`;
                      window.open(newQuoteUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="h-[40px] pl-[14px] pr-[20px] rounded-full bg-[#0366DD] text-white font-medium hover:bg-[#0257BD] active:scale-[0.99] transition-colors duration-200 outline-none flex items-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none">add</span>
                    <span className="text-[14px] tracking-[-0.01em]">Create new</span>
                  </button>
                </div>
                <div className="mt-1">
                  <QuotesSubNav
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    total={total}
                    onFiltersClick={() => setIsFiltersDrawerOpen(true)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterCount={activeFilterCount}
                  />
                </div>
                <div className="mt-10">
                  <QuotesList
                    quotes={filteredQuotes}
                    searchQuery={searchQuery}
                    onClearSearch={() => setSearchQuery('')}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={() => setAppliedFilters(EMPTY_FILTERS)}
                  />
                </div>
                {hasResults && (
                  <div className="mt-10 flex justify-end">
                    <Pagination rangeStart={rangeStart} rangeEnd={rangeEnd} total={total} />
                  </div>
                )}
              </div>
            </main>
          </div>

          <ContractAccountDrawer
            isOpen={isContractDrawerOpen}
            onClose={handleCloseContractDrawer}
            onChangeContract={() => setIsChangeDrawerOpen(true)}
            onManageOrg={onManageOrg}
            contractName={contractName}
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
            onQuotesClick={handleCloseContractDrawer}
          />

          <QuotesFiltersDrawer
            isOpen={isFiltersDrawerOpen}
            onClose={() => setIsFiltersDrawerOpen(false)}
            initialFilters={appliedFilters}
            onApply={setAppliedFilters}
          />
        </div>
      )}
    </div>
  );
};

export default QuotesPage;
