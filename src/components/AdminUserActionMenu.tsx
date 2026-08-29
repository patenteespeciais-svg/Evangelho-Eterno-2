import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type AdminActionType =
  | 'LIBERAR'
  | 'PROMOVER'
  | 'REBAIXAR'
  | 'ALERTAR'
  | 'SILENCIAR';

interface AdminUserActionMenuProps {
  targetUserCallSign?: string;
  onSelectAction?: (action: AdminActionType, userCallSign: string) => void;
  onClose: () => void;
}

export const AdminUserActionMenu: React.FC<AdminUserActionMenuProps> = ({
  targetUserCallSign = '',
  onSelectAction,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const items: { id: AdminActionType; label: string; color: string }[] = [
    { id: 'LIBERAR', label: 'LIBERAR', color: 'hover:bg-emerald-50 hover:text-emerald-700 text-neutral-800' },
    { id: 'PROMOVER', label: 'PROMOVER', color: 'hover:bg-blue-50 hover:text-blue-700 text-neutral-800' },
    { id: 'REBAIXAR', label: 'REBAIXAR', color: 'hover:bg-amber-50 hover:text-amber-700 text-neutral-800' },
    { id: 'ALERTAR', label: 'ALERTAR', color: 'hover:bg-orange-50 hover:text-orange-700 text-neutral-800' },
    { id: 'SILENCIAR', label: 'SILENCIAR', color: 'hover:bg-red-50 hover:text-red-700 text-neutral-800' },
  ];

  return (
    <div
      ref={popupRef}
      id="admin-user-action-floating-menu"
      className="w-48 bg-white text-neutral-900 rounded-2xl shadow-xl border border-neutral-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none relative"
    >
      {/* Botão fechar discreto */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-neutral-600 p-1 rounded-md transition-colors"
        title="Fechar"
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Lista na vertical com os itens inseridos */}
      <div className="flex flex-col space-y-1.5 py-1 pr-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            id={`admin-action-btn-${item.id.toLowerCase()}`}
            onClick={() => {
              if (onSelectAction) {
                onSelectAction(item.id, targetUserCallSign);
              }
              onClose();
            }}
            className={`w-full text-left font-tactical font-bold text-xs tracking-wider uppercase px-2.5 py-2 rounded-xl border border-transparent transition-all active:scale-95 cursor-pointer ${item.color}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
