import { getCsrfToken } from "next-auth/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";

export default async function SignIn({
  params,
}: {
  params: { callbackUrl: string };
}) {
  const session = await getServerAuthSession();
  if (!!session) {
    redirect(params.callbackUrl || "/");
  }
  const csrfToken = await getCsrfToken();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Link href="/" className="fixed left-4 top-2 hover:underline">
        Home
      </Link>
      <form
        method="POST"
        action="/api/auth/callback/credentials"
        className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border p-8 shadow-lg"
      >
        <input name="csrfToken" type="hidden" value={csrfToken} />
        <label className="flex flex-col">
          Email
          <input
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            type="text"
            id="email"
            name="email"
            placeholder="user.name@example.com"
          />
        </label>
        <label className="flex flex-col">
          Password
          <input
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            type="password"
            id="password"
            name="password"
            placeholder="Password"
          />
        </label>
        <button
          className="w-full rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300"
          type="submit"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
