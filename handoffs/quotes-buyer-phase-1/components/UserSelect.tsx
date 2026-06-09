import React, { useEffect, useRef, useState } from 'react';
import { USERS, UserOption } from '../data/users';

export type { UserOption };

const POPOVER_ANIMATION_MS = 180;

const UserChip: React.FC<{ user: UserOption; onRemove: () => void }> = ({ user, onRemove }) => (
  <span className="inline-flex items-center gap-1 pl-3 pr-1 py-[3px] rounded-full bg-[#F1F3F4] text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] select-none">
    <span>{user.name}</span>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={`Remove ${user.name}`}
      className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-black/70 hover:bg-black/10 active:bg-black/15 transition-colors duration-150"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14, lineHeight: 1 }}>
        close
      </span>
    </button>
  </span>
);

interface UserSelectProps {
  selectedUserIds: string[];
  onChange: (next: string[]) => void;
}

const UserSelect: React.FC<UserSelectProps> = ({ selectedUserIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverMounted, setPopoverMounted] = useState(false);
  const [popoverIn, setPopoverIn] = useState(false);
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedUsers = USERS.filter((u) => selectedUserIds.includes(u.id));
  const availableUsers = USERS.filter((u) => !selectedUserIds.includes(u.id));

  const trimmedFilter = filterText.trim().toLowerCase();
  const visibleUsers = (() => {
    if (trimmedFilter) {
      return availableUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(trimmedFilter) ||
          u.email.toLowerCase().includes(trimmedFilter),
      );
    }
    const common = availableUsers.filter((u) => u.isCommon);
    return common.length > 0 ? common : availableUsers.slice(0, 5);
  })();

  const addUser = (id: string) => {
    onChange([...selectedUserIds, id]);
    setFilterText('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeUser = (id: string) => {
    onChange(selectedUserIds.filter((uid) => uid !== id));
  };

  const openAndFocus = () => {
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setFilterText('');
      inputRef.current?.blur();
      return;
    }
    if (event.key === 'Backspace' && filterText === '' && selectedUsers.length > 0) {
      event.preventDefault();
      removeUser(selectedUsers[selectedUsers.length - 1].id);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (visibleUsers.length > 0) addUser(visibleUsers[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPopoverMounted(true);
      const t = setTimeout(() => setPopoverIn(true), 16);
      return () => clearTimeout(t);
    }
    setPopoverIn(false);
    const t = setTimeout(() => setPopoverMounted(false), POPOVER_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFilterText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const hasSelection = selectedUsers.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={openAndFocus}
        className={`
          w-full min-h-[56px] px-4 py-2 rounded-[4px] border bg-white cursor-text
          flex items-center gap-2
          transition-colors duration-200 ease-out
          ${isOpen ? 'border-[#0366DD]' : 'border-[#D6D6D6] hover:border-[#1F1F1F]'}
        `}
      >
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {selectedUsers.map((user) => (
            <UserChip key={user.id} user={user} onRemove={() => removeUser(user.id)} />
          ))}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            value={filterText}
            onChange={(event) => {
              setFilterText(event.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={hasSelection ? '' : 'Search users'}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-[14px] tracking-[-0.01em] text-[#1F1F1F] placeholder:text-[#5C5C5C] py-1"
          />
        </div>
      </div>

      {popoverMounted && (
        <div
          role="listbox"
          className={`
            absolute left-0 right-0 z-20 mt-1 origin-top max-h-[320px] overflow-y-auto
            bg-white border border-[#D6D6D6] rounded-[4px]
            shadow-[0_8px_24px_rgba(0,0,0,0.08)]
            transition-all ease-out
            ${popoverIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.98]'}
          `}
          style={{ transitionDuration: `${POPOVER_ANIMATION_MS}ms` }}
        >
          {visibleUsers.length === 0 ? (
            <div className="px-4 py-3 text-[14px] tracking-[-0.01em] text-[#5C5C5C]">
              No users found
            </div>
          ) : (
            visibleUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => addUser(user.id)}
                className="w-full px-4 py-2.5 flex flex-col text-left transition-colors duration-150 hover:bg-[#F5F5F5] active:bg-[#EBEBEB] outline-none"
              >
                <span className="text-[14px] leading-5 tracking-[-0.01em] text-[#1F1F1F] truncate">
                  {user.name}
                </span>
                <span className="text-[12px] leading-4 tracking-[-0.01em] text-[#5C5C5C] truncate">
                  {user.email}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserSelect;
