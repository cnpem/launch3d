import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/app/_components/ui/button";
import { MoveLeftIcon } from "lucide-react";
import { SignInForm } from "./form";

export default async function SignIn(props: {
  searchParams: Promise<{ callbackUrl: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerAuthSession();
  if (!!session) {
    redirect(searchParams.callbackUrl || "/");
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "link" }),
          "fixed left-2 top-4",
        )}
      >
        <MoveLeftIcon className="mr-2 h-4 w-4" />
        Home
      </Link>
      <SignInForm />
    </div>
  );
}
