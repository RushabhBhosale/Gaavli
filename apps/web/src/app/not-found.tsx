import Link from "next/link";
export default function NotFound() {
  return (
    <div className="p-12 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link className="mt-4 block text-emerald-800" href="/">
        Return to dashboard
      </Link>
    </div>
  );
}
