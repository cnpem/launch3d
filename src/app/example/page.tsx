import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export default async function Page() {
  const session = await getServerAuthSession();
  const params = new URLSearchParams({
    redirectUrl: "/example",
  });
  const redirectUrl = `/api/auth/signin?${params.toString()}`;

  if (!session) {
    redirect(redirectUrl);
  }

  const stdout = await api.ssh.ls({ path: "/ibira" });

  return (
    <div>
      <h1>Secret Page</h1>
      <p>Only logged in users can see this page</p>
      <pre>{stdout}</pre>
    </div>
  );
}
