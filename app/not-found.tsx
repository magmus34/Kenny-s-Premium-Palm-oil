import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-extrabold text-stone-900 mb-2">404 - Page Not Found</h1>
      <p className="text-stone-600 mb-6">The page or product you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );
}
