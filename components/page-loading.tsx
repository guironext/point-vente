export function PageLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-line" />
      <div className="h-40 rounded-2xl bg-line/70" />
      <div className="h-64 rounded-2xl bg-line/70" />
    </div>
  );
}

export default PageLoading;
