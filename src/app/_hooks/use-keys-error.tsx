"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { MISSING_SSH_KEYS_ERROR } from "~/lib/constants";

type HookProps = {
  isError: boolean;
  error: unknown;
};

export function useKeysError(props: HookProps) {
  const { isError, error } = props;

  const e = error as Error;

  useEffect(() => {
    if (isError && e.message === MISSING_SSH_KEYS_ERROR) {
      void signOut();
    }
  }, [isError, e]);
}
