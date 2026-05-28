export default function MovieCardSkeleton() {
  return (
    <div className="rounded-xl bg-bg-card overflow-hidden">
      {/* Poster placeholder */}
      <div className="aspect-[2/3] skeleton" />

      {/* Info section */}
      <div className="p-3 space-y-2">
        {/* Title placeholder */}
        <div className="h-4 w-3/4 rounded skeleton" />

        {/* Year / rating placeholder */}
        <div className="h-3 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}
