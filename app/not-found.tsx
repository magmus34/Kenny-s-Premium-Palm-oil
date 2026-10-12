import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4 text-2xl font-black">
        404
      </div>
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-stone-600 mb-6 max-w-sm">
        The page you requested does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all"
      >
        Return to Store
      </Link>
    </div>
  );
}
