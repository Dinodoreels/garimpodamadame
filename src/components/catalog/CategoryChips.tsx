import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useProductCategories } from '@/hooks/useProductCategories';

interface CategoryChipsProps {
  productCounts: Record<string, number>;
  selected: string;
  onSelect: (value: string) => void;
}

export function CategoryChips({ productCounts, selected, onSelect }: CategoryChipsProps) {
  const { data: categories = [] } = useProductCategories();

  const visible = useMemo(() => {
    return categories
      .map((c) => ({ ...c, count: productCounts[c.value] || 0 }))
      .filter((c) => c.count > 0);
  }, [categories, productCounts]);

  const totalCount = useMemo(
    () => Object.values(productCounts).reduce((s, n) => s + n, 0),
    [productCounts]
  );

  if (visible.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={cn(
          'shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors',
          selected === ''
            ? 'border-foreground bg-foreground text-background'
            : 'border-border text-foreground hover:bg-muted'
        )}
      >
        Todos <span className="opacity-60">({totalCount})</span>
      </button>
      {visible.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.value)}
          className={cn(
            'shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-wide transition-colors uppercase',
            selected === cat.value
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-foreground hover:bg-muted'
          )}
        >
          {cat.label} <span className="opacity-60">({cat.count})</span>
        </button>
      ))}
    </div>
  );
}
