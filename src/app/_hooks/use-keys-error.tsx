"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

type HookProps = {
  isError: boolean;
  error: unknown;
};

export function useKeysError(props: HookProps) {
  const { isError, error } = props;

  const e = error as Error;

  useEffect(() => {
    if (isError && e.message === "No keys found for user") {
      void signOut();
    }
  }, [isError, e]);
}
