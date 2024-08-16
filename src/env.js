import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    LDAP_CERTIFICATE_PATH: z.string(),
    LDAP_URL: z.string(),
    SSH_HOST: z.string(),
    SSH_PASSPHRASE: z.string().optional(),
    SSH_KEYS_PATH: z.string(),
    ANNOTAT3D_CONTAINER_PATH: z.string(),
    ANNOTAT3D_PORT_RANGE0: z.string(),
    ANNOTAT3D_PORT_RANGE1: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_SLURM_GPU_OPTIONS: z.string(),
    NEXT_PUBLIC_SLURM_MAX_CPUS: z.string(),
    NEXT_PUBLIC_STORAGE_PATH: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    LDAP_CERTIFICATE_PATH: process.env.LDAP_CERTIFICATE_PATH,
    LDAP_URL: process.env.LDAP_URL,
    SSH_HOST: process.env.SSH_HOST,
    SSH_PASSPHRASE: process.env.SSH_PASSPHRASE,
    SSH_KEYS_PATH: process.env.SSH_KEYS_PATH,
    ANNOTAT3D_CONTAINER_PATH: process.env.ANNOTAT3D_CONTAINER_PATH,
    ANNOTAT3D_PORT_RANGE0: process.env.ANNOTAT3D_PORT_RANGE0,
    ANNOTAT3D_PORT_RANGE1: process.env.ANNOTAT3D_PORT_RANGE1,
    NEXT_PUBLIC_SLURM_GPU_OPTIONS: process.env.NEXT_PUBLIC_SLURM_GPU_OPTIONS,
    NEXT_PUBLIC_SLURM_MAX_CPUS: process.env.NEXT_PUBLIC_SLURM_MAX_CPUS,
    NEXT_PUBLIC_STORAGE_PATH: process.env.NEXT_PUBLIC_STORAGE_PATH,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
