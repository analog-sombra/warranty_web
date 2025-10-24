import Link from "next/link";

export default function Home() {
  return (
    <div>
      <Link
        href="/login"
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        Login
      </Link>
    </div>
  );
}
