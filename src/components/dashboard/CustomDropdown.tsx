'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  defaultValue?: string; // "Todos" ou "Todas"
  disabled?: boolean;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className,
  defaultValue = 'Todos',
  disabled = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse dos valores que vêm das propriedades
  const propSelectedValues = value === defaultValue || !value ? [] : value.split(',');

  // Estado local para acumular a seleção enquanto o dropdown estiver aberto
  const [localSelected, setLocalSelected] = useState<string[]>(propSelectedValues);

  // Sincroniza a seleção local quando o menu é aberto
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(propSelectedValues);
    }
  }, [isOpen, value]);

  // Dispara o onChange somente quando o dropdown fecha
  const prevIsOpen = useRef(isOpen);
  useEffect(() => {
    // Se mudou de aberto para fechado
    if (prevIsOpen.current && !isOpen) {
      const finalValue = localSelected.length === 0 || localSelected.includes(defaultValue)
        ? defaultValue
        : options
            .map((opt) => opt.value)
            .filter((val) => localSelected.includes(val))
            .join(',');

      if (finalValue !== value) {
        onChange(finalValue);
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, localSelected, onChange, value, defaultValue, options]);

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.ctrlKey) {
      // Seleção múltipla com a tecla CTRL
      if (optionValue === defaultValue) {
        setLocalSelected([]);
      } else {
        if (localSelected.includes(optionValue)) {
          setLocalSelected(localSelected.filter((v) => v !== optionValue));
        } else {
          setLocalSelected([...localSelected.filter((v) => v !== defaultValue), optionValue]);
        }
      }
    } else {
      // Clique simples (seleção única) — seleciona apenas o item e fecha o dropdown
      if (optionValue === defaultValue) {
        setLocalSelected([]);
      } else {
        setLocalSelected([optionValue]);
      }
      setIsOpen(false);
    }
  };

  // Exibe a seleção local se aberto (para feedback instantâneo), caso contrário a da URL
  const activeSelected = isOpen ? localSelected : propSelectedValues;
  let displayLabel = defaultValue;
  if (activeSelected.length > 0) {
    displayLabel = options
      .filter((opt) => activeSelected.includes(opt.value))
      .map((opt) => opt.label)
      .join(', ');
  }

  return (
    <div className={cn("relative select-none", className)} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-6 text-[11px] bg-white border-slate-200 shadow-sm transition-colors w-full flex items-center justify-between px-2 rounded-md border hover:border-slate-300 [&>span]:block [&>span]:truncate overflow-hidden text-left",
          disabled && "opacity-40 cursor-not-allowed",
          isOpen && "border-blue-500 ring-1 ring-blue-500"
        )}
      >
        <span className="text-slate-900 block truncate pr-2 w-full">
          {displayLabel || placeholder}
        </span>
        <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full min-w-[200px] max-h-60 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-lg z-[60] py-1">
          {/* Dica de multi-seleção no topo do painel pra garantir visibilidade. */}
          <div className="mb-1 px-2.5 pt-0.5 pb-1 border-b border-slate-100 text-[10px] text-slate-400 leading-tight">
            <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-600">Ctrl</kbd>
            <span className="mx-1">+ clique para múltiplos</span>
          </div>
          {/* Opção Padrão (Todos/Todas) */}
          <div
            onClick={(e) => handleOptionClick(defaultValue, e)}
            className={cn(
              "px-2.5 py-1 text-xs cursor-pointer rounded-md mx-1 transition-colors hover:bg-slate-50",
              activeSelected.length === 0
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-700"
            )}
          >
            {defaultValue}
          </div>
          {options
            .filter((opt) => opt.value !== defaultValue)
            .map((opt) => {
              const isSelected = activeSelected.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={(e) => handleOptionClick(opt.value, e)}
                  className={cn(
                    "px-2.5 py-1 text-xs cursor-pointer rounded-md mx-1 transition-colors hover:bg-slate-50",
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-700"
                  )}
                >
                  {opt.label}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
