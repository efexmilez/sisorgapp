interface Props {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, pages, total, onPage }: Props) {
  if (pages <= 1) return null;

  const range: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
    range.push(i);
  }

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/15">
      <p className="text-sm text-on-surface-variant">
        Page {page} of {pages} ({total} total)
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        {range[0] > 1 && (
          <>
            <button onClick={() => onPage(1)} className="px-3 py-1 rounded-lg text-sm hover:bg-surface-container-high transition-colors">1</button>
            {range[0] > 2 && <span className="px-1 text-on-surface-variant text-sm">…</span>}
          </>
        )}
        {range.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              p === page ? 'bg-primary text-white' : 'hover:bg-surface-container-high text-on-surface'
            }`}
          >
            {p}
          </button>
        ))}
        {range[range.length - 1] < pages && (
          <>
            {range[range.length - 1] < pages - 1 && <span className="px-1 text-on-surface-variant text-sm">…</span>}
            <button onClick={() => onPage(pages)} className="px-3 py-1 rounded-lg text-sm hover:bg-surface-container-high transition-colors">{pages}</button>
          </>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
