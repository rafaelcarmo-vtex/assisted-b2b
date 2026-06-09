import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SalesRepHome.css';

interface Quote {
  id: string;
  status: 'requested' | 'revised' | 'approved' | 'expired';
  isNew?: boolean;
  expires?: string;
  companyName: string;
  buyerName: string;
  total: string;
  logoUrl?: string;
  contextSlug?: string;
  ownerScope: 'mine' | 'team';
}

interface ActionCard {
  id: string;
  icon: string;
  title: string;
  onClick?: () => void;
}

interface MetricCard {
  label: string;
  value: string;
}

const QUOTES: Quote[] = [
  {
    id: 'ORD-2023-XYZ-789',
    status: 'requested',
    isNew: true,
    companyName: 'Stellar Global',
    buyerName: 'Kelly Davis',
    total: '$33,726.18',
    logoUrl: '/logo-stellarglobal.png',
    contextSlug: 'stellar-global',
    ownerScope: 'team',
  },
  {
    id: 'ORD-0312-ABS-321',
    status: 'requested',
    expires: 'Expires in 10 hours',
    companyName: 'LabMark',
    buyerName: 'Sarah Mitchell',
    total: '$43,032.91',
    ownerScope: 'team',
  },
  {
    id: 'QRD-8323-XYZ-392',
    status: 'revised',
    expires: 'Expires in 10 hours',
    companyName: 'TechMax',
    buyerName: 'Carlos Ferreira',
    total: '$104,029.20',
    ownerScope: 'team',
  },
  {
    id: 'RRD-9928-XYZ-129',
    status: 'approved',
    expires: 'Expires in 10 hours',
    companyName: 'NovaCorp',
    buyerName: 'James Whitfield',
    total: '$31,540.00',
    ownerScope: 'team',
  },
  {
    id: 'BPQ-4471-MNO-558',
    status: 'revised',
    expires: 'Expires in 3 days',
    companyName: 'Vertex Systems',
    buyerName: 'Patricia Lowe',
    total: '$78,310.40',
    ownerScope: 'team',
  },
  {
    id: 'RDY-7712-PQR-003',
    status: 'approved',
    expires: 'Expires in 5 days',
    companyName: 'Orion Retail',
    buyerName: 'Marcus Chen',
    total: '$19,870.00',
    ownerScope: 'team',
  },
  {
    id: 'IPQ-6630-DEF-774',
    status: 'requested',
    expires: 'Expires in 2 days',
    companyName: 'Maple Dynamics',
    buyerName: 'Rachel Torres',
    total: '$62,150.75',
    ownerScope: 'team',
  },
  {
    id: 'EXP-1190-GHI-882',
    status: 'expired',
    expires: 'Expired 2 days ago',
    companyName: 'Crestview Inc.',
    buyerName: 'Tom Nakamura',
    total: '$8,430.00',
    ownerScope: 'team',
  },
  {
    id: 'RDY-5540-JKL-217',
    status: 'approved',
    expires: 'Expires in 1 day',
    companyName: 'Horizon Group',
    buyerName: 'Linda Park',
    total: '$55,200.00',
    ownerScope: 'team',
  },
  {
    id: 'BPQ-2285-STU-640',
    status: 'revised',
    expires: 'Expires in 4 days',
    companyName: 'BluePeak Corp',
    buyerName: 'Kevin Osei',
    total: '$130,640.90',
    ownerScope: 'team',
  },
  {
    id: 'EXP-0041-VWX-915',
    status: 'expired',
    expires: 'Expired 5 days ago',
    companyName: 'Redstone Partners',
    buyerName: 'Ana Sousa',
    total: '$12,780.50',
    ownerScope: 'team',
  },
  {
    id: 'IPQ-8803-YZA-361',
    status: 'requested',
    expires: 'Expires in 6 hours',
    companyName: 'Oakfield Solutions',
    buyerName: 'Robert Fleming',
    total: '$71,920.00',
    ownerScope: 'team',
  },
];

type StatusFilter = 'all' | Quote['status'];
type OwnerFilter = 'all' | 'mine';

const STATUS_FILTERS: { id: StatusFilter; label: string; dotClass?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Requested', dotClass: 'orange' },
  { id: 'revised', label: 'Revised', dotClass: 'green' },
  { id: 'approved', label: 'Approved', dotClass: 'blue' },
  { id: 'expired', label: 'Expired', dotClass: 'gray' },
];

const STATUS_DOT_CLASS: Record<Quote['status'], string> = {
  requested: 'orange',
  revised: 'green',
  approved: 'blue',
  expired: 'gray',
};

const STATUS_LABEL: Record<Quote['status'], string> = {
  requested: 'Requested',
  revised: 'Revised',
  approved: 'Approved',
  expired: 'Expired',
};

interface SalesRepHomeProps {
  onOpenQuote: (slug: string) => void;
}

const SalesRepHome: React.FC<SalesRepHomeProps> = ({ onOpenQuote }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerSubOpen, setIsDrawerSubOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');

  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const ownerMenuRef = useRef<HTMLDivElement | null>(null);

  const filteredQuotes = useMemo(() => {
    const query = drawerSearch.trim().toLowerCase();
    return QUOTES.filter((quote) => {
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      const matchesOwner = ownerFilter === 'all' || quote.ownerScope === ownerFilter;
      const matchesQuery =
        !query ||
        quote.id.toLowerCase().includes(query) ||
        quote.companyName.toLowerCase().includes(query) ||
        quote.buyerName.toLowerCase().includes(query);
      return matchesStatus && matchesOwner && matchesQuery;
    });
  }, [statusFilter, ownerFilter, drawerSearch]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDrawerSubOpen) {
          setIsDrawerSubOpen(false);
        } else {
          setIsDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDrawerOpen, isDrawerSubOpen]);

  useEffect(() => {
    if (!isStatusMenuOpen && !isOwnerMenuOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setIsStatusMenuOpen(false);
      }
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(target)) {
        setIsOwnerMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isStatusMenuOpen, isOwnerMenuOpen]);

  const openQuotesSubPanel = () => {
    setIsDrawerOpen(true);
    setIsDrawerSubOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setIsDrawerSubOpen(false);
  };

  const handleQuoteClick = (quote: Quote) => {
    if (!quote.contextSlug) return;
    onOpenQuote(quote.contextSlug);
  };

  const actionCards: ActionCard[] = [
    { id: 'new-order', icon: 'inventory', title: 'New Order' },
    { id: 'quotes', icon: 'content_paste_go', title: 'Quotes', onClick: openQuotesSubPanel },
    { id: 'orders', icon: 'receipt_long', title: 'Orders' },
    { id: 'portfolio', icon: 'group', title: 'Customer Portfolio' },
  ];

  const metricCards: MetricCard[] = [
    { label: 'Total Orders', value: '$275,754' },
    { label: 'Quotations Converted', value: '6' },
    { label: 'Items Sold', value: '43' },
    { label: 'Average Order Value', value: '$394.07' },
  ];

  const drawerClassName = [
    'srh-drawer',
    isDrawerOpen ? 'open' : '',
    isDrawerSubOpen ? 'is-sub is-sub-quotes' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusFilterMeta = STATUS_FILTERS.find((f) => f.id === statusFilter) ?? STATUS_FILTERS[0];

  return (
    <div className="srh-root">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="srh-header">
        <div className="srh-header-main">
          <div className="srh-header-left">
            <button
              type="button"
              className="srh-btn-menu"
              aria-label="Open menu"
              onClick={() => setIsDrawerOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button type="button" className="srh-header-logo">
              Demo Store
            </button>
          </div>

          <div className="srh-header-center">
            <div className="srh-search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for items, brands and collections…"
                aria-label="Search"
              />
              <span className="material-symbols-outlined">search</span>
            </div>
          </div>

          <div className="srh-header-right">
            <button type="button" className="srh-btn-identify">
              <span className="srh-btn-avatar">
                <img src="/avatar-andrew.png" alt="Andrew" />
              </span>
              <span>Andrew Miller</span>
            </button>
            <button type="button" className="srh-btn-cart" aria-label="Shopping cart">
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="srh-cart-dot">3</span>
            </button>
          </div>
        </div>

        <nav className="srh-header-nav" aria-label="Categories">
          <div className="srh-nav-info">
            <span className="srh-nav-info-item">
              <span className="srh-ni-lbl">Ship to:</span>
              <button type="button" className="srh-ni-val">
                Boston Boylston St
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </span>
            <span className="srh-ni-sep">|</span>
            <span className="srh-nav-info-item">
              <span className="srh-ni-lbl">Sold by:</span>
              <button type="button" className="srh-ni-val">
                Ecommerce
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </span>
          </div>
        </nav>
      </header>

      {/* ─── Home page ─────────────────────────────────── */}
      <div className="srh-page-scroll">
        <div className="srh-home-page">
          {/* Profile + Goal */}
          <div className="srh-home-profile">
            <div className="srh-home-avatar">
              <img src="/avatar-andrew.png" alt="Andrew Miller" />
            </div>

            <div className="srh-home-profile-info">
              <div className="srh-home-profile-top">
                <h1 className="srh-home-greeting">Hi, Andrew Miller</h1>
                <button type="button" className="srh-home-profile-btn">My profile</button>
              </div>

              <div className="srh-home-goal-label-row">
                <span>Today's goal</span>
                <span>55%</span>
              </div>
              <div className="srh-home-goal-bar">
                <div className="srh-home-goal-fill" style={{ width: '55%' }} />
              </div>
              <div className="srh-home-goal-amounts">
                <span>$275,754</span>
                <span>$500,000</span>
              </div>
              <div className="srh-home-goal-status">
                <div className="srh-home-goal-status-left">
                  <span className="material-symbols-outlined">trending_up</span>
                  <span>
                    <strong>You're doing great!</strong> At this rate, you will reach your goal 8 days ahead of schedule.
                  </span>
                </div>
                <span className="srh-home-goal-renew">Renews on 03/01</span>
              </div>
            </div>
          </div>

          {/* Let's go */}
          <div className="srh-home-section">
            <div className="srh-home-section-layout">
              <div className="srh-home-section-title">Let's go!</div>
              <div className="srh-home-cards-grid">
                {actionCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="srh-action-card"
                    onClick={card.onClick}
                  >
                    <span className="material-symbols-outlined">{card.icon}</span>
                    <div className="srh-action-card-title">{card.title}</div>
                    <div className="srh-action-card-arrow" aria-hidden="true">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Today's orders */}
          <div className="srh-home-section">
            <div className="srh-home-section-layout">
              <div className="srh-home-section-title">Today's orders</div>
              <div className="srh-home-cards-grid">
                {metricCards.map((metric) => (
                  <button key={metric.label} type="button" className="srh-metric-card">
                    <div className="srh-metric-card-label">{metric.label}</div>
                    <div className="srh-metric-card-value">{metric.value}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Drawer overlay ─────────────────────────── */}
      <div
        className={`srh-drawer-overlay${isDrawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* ─── Drawer ────────────────────────────────── */}
      <aside
        className={drawerClassName}
        aria-label="Main menu"
        role="dialog"
        aria-modal="true"
      >
        <div className="srh-drawer-header">
          <div className="srh-drawer-header-main">
            <button type="button" className="srh-header-logo" onClick={closeDrawer}>
              Demo Store
            </button>
            <button
              type="button"
              className="srh-drawer-close"
              aria-label="Close menu"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="srh-drawer-header-sub">
            <button
              type="button"
              className="srh-drawer-back-btn"
              aria-label="Go back"
              onClick={() => setIsDrawerSubOpen(false)}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="srh-drawer-sub-title">Quotes</span>
            <button
              type="button"
              className="srh-drawer-close"
              aria-label="Close menu"
              onClick={closeDrawer}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="srh-drawer-body">
          <div className="srh-drawer-grid">
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">add_shopping_cart</span>
              <span className="srh-drawer-item-label">New Cart</span>
            </button>
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">inventory</span>
              <span className="srh-drawer-item-label">New Quote</span>
            </button>
            <button type="button" className="srh-drawer-item active">
              <span className="material-symbols-outlined">badge</span>
              <span className="srh-drawer-item-label">Home</span>
            </button>
            <button type="button" className="srh-drawer-item" onClick={openQuotesSubPanel}>
              <span className="material-symbols-outlined">content_paste_go</span>
              <span className="srh-drawer-item-label">Quotes</span>
            </button>
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">groups</span>
              <span className="srh-drawer-item-label">Customer Portfolio</span>
            </button>
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="srh-drawer-item-label">Orders</span>
            </button>
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">explore</span>
              <span className="srh-drawer-item-label">Explore</span>
            </button>
            <button type="button" className="srh-drawer-item">
              <span className="material-symbols-outlined">monitor_heart</span>
              <span className="srh-drawer-item-label">App Status</span>
            </button>
          </div>
        </div>

        <div className="srh-drawer-footer">
          <img className="srh-drawer-avatar" src="/avatar-andrew.png" alt="User photo" />
          <div className="srh-drawer-user-info">
            <span className="srh-drawer-user-name">Andrew Miller</span>
            <span className="srh-drawer-user-email">a.miller@demostore.com</span>
          </div>
          <button type="button" className="srh-drawer-btn-logout" aria-label="Sign out">
            <span className="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </div>

        {/* Sub-panel: Quotes */}
        <div className="srh-drawer-sub-panel">
          <div className="srh-qc-search-wrap">
            <span className="material-symbols-outlined srh-qc-search-icon">search</span>
            <input
              type="text"
              className="srh-qc-search-input"
              placeholder="Search by account, buyer, contract…"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
            />
            {drawerSearch && (
              <button
                type="button"
                className="srh-qc-search-clear"
                onClick={() => setDrawerSearch('')}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          <div className="srh-qc-filters-row">
            <div className="srh-qc-filter-wrap" ref={statusMenuRef}>
              <button
                type="button"
                className="srh-qc-filter-btn"
                onClick={() => {
                  setIsStatusMenuOpen((v) => !v);
                  setIsOwnerMenuOpen(false);
                }}
              >
                {statusFilterMeta.dotClass && (
                  <span className={`srh-qc-filter-btn-dot srh-qc-tab-dot ${statusFilterMeta.dotClass}`} />
                )}
                <span>{statusFilterMeta.label}</span>
                <span
                  className={`material-symbols-outlined srh-qc-filter-chevron${
                    isStatusMenuOpen ? ' open' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              <div className={`srh-qc-filter-menu${isStatusMenuOpen ? ' open' : ''}`}>
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`srh-qc-filter-item${
                      statusFilter === filter.id ? ' active' : ''
                    }`}
                    onClick={() => {
                      setStatusFilter(filter.id);
                      setIsStatusMenuOpen(false);
                    }}
                  >
                    {filter.dotClass && (
                      <span className={`srh-qc-tab-dot ${filter.dotClass}`} />
                    )}
                    <span className="srh-qc-filter-item-label">{filter.label}</span>
                    {statusFilter === filter.id && (
                      <span className="material-symbols-outlined srh-qc-filter-item-check">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="srh-qc-filter-wrap" ref={ownerMenuRef}>
              <button
                type="button"
                className="srh-qc-filter-btn"
                onClick={() => {
                  setIsOwnerMenuOpen((v) => !v);
                  setIsStatusMenuOpen(false);
                }}
              >
                <span>{ownerFilter === 'mine' ? 'My clients' : 'All clients'}</span>
                <span
                  className={`material-symbols-outlined srh-qc-filter-chevron${
                    isOwnerMenuOpen ? ' open' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              <div className={`srh-qc-filter-menu${isOwnerMenuOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className={`srh-qc-filter-item${ownerFilter === 'mine' ? ' active' : ''}`}
                  onClick={() => {
                    setOwnerFilter('mine');
                    setIsOwnerMenuOpen(false);
                  }}
                >
                  <span className="srh-qc-filter-item-label">My clients</span>
                  {ownerFilter === 'mine' && (
                    <span className="material-symbols-outlined srh-qc-filter-item-check">
                      check
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={`srh-qc-filter-item${ownerFilter === 'all' ? ' active' : ''}`}
                  onClick={() => {
                    setOwnerFilter('all');
                    setIsOwnerMenuOpen(false);
                  }}
                >
                  <span className="srh-qc-filter-item-label">All clients</span>
                  {ownerFilter === 'all' && (
                    <span className="material-symbols-outlined srh-qc-filter-item-check">
                      check
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {filteredQuotes.length === 0 && (
            <div className="srh-qc-empty-state">
              <span className="material-symbols-outlined">manage_accounts</span>
              <span className="srh-qc-empty-title">No quotes found</span>
              <span className="srh-qc-empty-msg">
                Try adjusting your filters or search.
              </span>
            </div>
          )}

          {filteredQuotes.map((quote) => {
            const isInteractive = Boolean(quote.contextSlug);
            return (
              <button
                key={quote.id}
                type="button"
                className="srh-qc-card"
                onClick={() => handleQuoteClick(quote)}
                disabled={!isInteractive}
              >
                <div className="srh-qc-card-top">
                  <div>
                    <div className="srh-qc-card-id">{quote.id}</div>
                    {quote.isNew && <span className="srh-qc-badge-new">New</span>}
                    {!quote.isNew && quote.expires && (
                      <div className="srh-qc-card-expires">{quote.expires}</div>
                    )}
                  </div>
                  <div className="srh-qc-card-status">
                    <span className={`srh-qc-status-dot ${STATUS_DOT_CLASS[quote.status]}`} />
                    <span className="srh-qc-card-status-label">{STATUS_LABEL[quote.status]}</span>
                  </div>
                </div>
                <div className="srh-qc-card-bottom">
                  <div className="srh-qc-company">
                    <div className={`srh-qc-avatar${quote.logoUrl ? '' : ' light'}`}>
                      {quote.logoUrl ? (
                        <img src={quote.logoUrl} alt={quote.companyName} />
                      ) : (
                        <span className="material-symbols-outlined">apartment</span>
                      )}
                    </div>
                    <div className="srh-qc-company-info">
                      <span className="srh-qc-company-name">{quote.companyName}</span>
                      <span className="srh-qc-buyer-name">{quote.buyerName}</span>
                    </div>
                  </div>
                  <div className="srh-qc-meta">
                    <span className="srh-qc-meta-item">
                      Total <strong>{quote.total}</strong>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default SalesRepHome;
