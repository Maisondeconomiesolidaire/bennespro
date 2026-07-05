import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * Select custom (listbox) : bouton + popover portalisé, navigation clavier,
 * recherche optionnelle. Remplace les `<select>` natifs.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "— Sélectionner —",
  searchable = false,
  searchPlaceholder = "Rechercher…",
  disabled = false,
  className,
  actions,
}: {
  value: T | "";
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Ligne d'action optionnelle affichée sous la liste (ex. « + Nouvelle »). */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; up: boolean }>();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxH = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const up = spaceBelow < Math.min(maxH, 220) && rect.top > spaceBelow;
    setPosition({
      top: up ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      up,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = filtered.findIndex((o) => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 10);

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll(event: Event) {
      if (popoverRef.current?.contains(event.target as Node)) return;
      updatePosition();
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setHighlighted((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function choose(option: SelectOption<T>) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        if (filtered[highlighted]) choose(filtered[highlighted]);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 text-left text-sm shadow-sm transition",
          "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10",
          open && "border-brand-500 ring-4 ring-brand-500/10",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-[var(--muted-foreground)]")}>
          {selected?.icon}
          <span className="truncate font-medium text-[var(--foreground)]">
            {selected ? selected.label : <span className="font-normal text-[var(--muted-foreground)]">{placeholder}</span>}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform", open && "rotate-180")} />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              onKeyDown={onKeyDown}
              className="animate-enter fixed z-[70] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-strong)]"
              style={{
                left: position.left,
                width: position.width,
                ...(position.up
                  ? { bottom: window.innerHeight - position.top }
                  : { top: position.top }),
              }}
            >
              {searchable ? (
                <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
                  <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlighted(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="h-10 w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
                  />
                </div>
              ) : null}
              <div ref={listRef} className="thin-scroll max-h-[260px] overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">Aucun résultat.</p>
                ) : (
                  filtered.map((option, i) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-index={i}
                        disabled={option.disabled}
                        onMouseEnter={() => setHighlighted(i)}
                        onClick={() => choose(option)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition",
                          i === highlighted && "bg-[var(--accent)]",
                          isSelected && "bg-[var(--selected)] text-[var(--selected-foreground)]",
                          option.disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {option.icon}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[var(--foreground)]">{option.label}</span>
                          {option.description ? (
                            <span className="block truncate text-xs text-[var(--muted-foreground)]">{option.description}</span>
                          ) : null}
                        </span>
                        {isSelected ? <Check className="h-4 w-4 shrink-0 text-brand-500" /> : null}
                      </button>
                    );
                  })
                )}
              </div>
              {actions ? <div className="border-t border-[var(--border)] p-1.5">{actions}</div> : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
