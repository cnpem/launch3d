import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import View from "~/app/instances/view";

export default async function Page() {
  const session = await getServerAuthSession();
  const params = new URLSearchParams({
    redirectUrl: "/instances",
  });
  const redirectUrl = `/api/auth/signin?${params.toString()}`;

  if (!session?.user?.name) {
    redirect(redirectUrl);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <View />
    </main>
  );
}
