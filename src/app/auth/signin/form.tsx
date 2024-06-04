"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";

export const SignInForm = () => {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const callbackError = params.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    email: string;
    password: string;
  }>();
  const onSubmit = async (data: { email: string; password: string }) => {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      callbackUrl,
    });
  };

  useEffect(() => {
    if (callbackError && callbackError === "CredentialsSignin") {
      toast.error("Invalid credentials");
    }
  }, [callbackError]);

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
          {...register("password", {
            required: "Password is required!",
          })}
        />
      </Label>
      <Button className="w-full" variant="default" type="submit">
        Sign in
      </Button>
    </form>
  );
};
