export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return null;
  const full = Math.round(rating);
  const c = count == null ? '' : count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);
  return (
    <span className="stars" aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ''}`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}<em>{rating.toFixed(1)}{c && ` (${c})`}</em>
    </span>
  );
}
