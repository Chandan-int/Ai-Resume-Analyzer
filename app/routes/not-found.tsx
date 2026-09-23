import { Link } from "react-router";

export const meta = () => [
  { title: "404 - Page Not Found" },
];

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <p className="text-xl text-gray-600 mt-2 mb-6">Page Not Found</p>
      <Link to="/" className="primary-button w-fit">
        Back to Homepage
      </Link>
    </main>
  );
}
