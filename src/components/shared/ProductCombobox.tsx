"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listKnowledgeProducts, type KBProduct } from "@/services/knowledge.service";

interface ProductComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onKnownChange?: (known: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductCombobox({
  value,
  onChange,
  onKnownChange,
  placeholder = "Select or add a product",
  disabled,
}: ProductComboboxProps) {
  const [products, setProducts] = useState<KBProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    listKnowledgeProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedValue = value.trim().toLowerCase();
  const exactMatch = products.some((product) => product.name.toLowerCase() === normalizedValue);

  const filteredProducts = useMemo(() => {
    if (!normalizedValue) return products;
    return products.filter((product) => product.name.toLowerCase().includes(normalizedValue));
  }, [normalizedValue, products]);

  useEffect(() => {
    onKnownChange?.(Boolean(normalizedValue && exactMatch));
  }, [exactMatch, normalizedValue, onKnownChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectProduct = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading products...</div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <button
                key={product.name}
                type="button"
                onClick={() => selectProduct(product.name)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{product.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {product.document_count} docs
                  {product.name.toLowerCase() === normalizedValue && <Check className="size-3" />}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching products.</div>
          )}

          {value.trim() && !exactMatch ? (
            <div className="mt-1 border-t pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => selectProduct(value.trim())}
              >
                <Plus className="size-4" />
                Add &quot;{value.trim()}&quot;
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
