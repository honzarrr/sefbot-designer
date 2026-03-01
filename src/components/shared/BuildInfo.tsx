'use client';

export function BuildInfo() {
  const hash = process.env.NEXT_PUBLIC_GIT_HASH ?? 'dev';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const formatted = buildTime
    ? new Date(buildTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'dev';

  return (
    <div className="text-[10px] text-muted-foreground/60 text-center py-1 select-all">
      Build {hash} &middot; {formatted}
    </div>
  );
}
