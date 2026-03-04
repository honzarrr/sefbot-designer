import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link
          href="/"
          className="inline-block text-sm text-primary underline hover:text-primary/80"
        >
          Go to Projects
        </Link>
      </div>
    </div>
  );
}
