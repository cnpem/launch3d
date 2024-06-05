"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export const SignInForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{
    email: string;
    password: string;
  }>();
  const onSubmit = async (data: { email: string; password: string }) => {
    toast.info("Signing in...");
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (res?.ok) {
      toast.success("Signed in successfully");
      router.push(callbackUrl);
      router.refresh();
    }

    if (!res?.ok) {
      toast.error("Invalid credentials");
      reset();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border p-8 shadow-lg"
    >
      <Label className="flex flex-col gap-2">
        Email
        {errors.email && (
          <span className="text-red-600">{errors.email.message}</span>
        )}
        <Input
          type="text"
          id="email"
          placeholder="user.name@example.com"
          data-invalid={errors.email ? true : false}
          className="data-[invalid=true]:border-red-600 data-[invalid=true]:ring-red-600"
          {...register("email", { required: "Email is required!" })}
        />
      </Label>
      <Label className="flex flex-col gap-2 peer-required:text-red-600">
        Password
        {errors.password && (
          <span className="text-red-600">{errors.password.message}</span>
        )}
        <Input
          type="password"
          id="password"
          placeholder="Password"
          data-invalid={errors.password ? true : false}
          className="data-[invalid=true]:border-red-600 data-[invalid=true]:ring-red-600"
          {...register("password", {
            required: "Password is required!",
          })}
        />
      </Label>
      <Button
        className="w-full"
        variant="default"
        type="submit"
        disabled={isSubmitting}
      >
        Sign in
      </Button>
    </form>
  );
};
