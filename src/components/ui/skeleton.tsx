import React from 'react';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
      {...props}
    />
  );
};

export const AvatarSkeleton = () => (
  <Skeleton className="h-10 w-10 rounded-full" />
);

export const TextSkeleton = ({ lines = 3, className = "" }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton 
        key={i} 
        className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
      />
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 p-6 space-y-4">
    <Skeleton className="h-32 w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const ListSkeleton = ({ items = 3 }: { items?: number }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <AvatarSkeleton />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

export const ButtonSkeleton = () => (
  <Skeleton className="h-10 w-24 rounded-lg" />
);

export const InputSkeleton = () => (
  <Skeleton className="h-10 w-full rounded-lg" />
);
