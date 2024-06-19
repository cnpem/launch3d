import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedureWithCredentials,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ssh } from "~/server/ssh";
import { env } from "~/env";

export const sshRouter = createTRPCRouter({
  ls: protectedProcedureWithCredentials
    .input(z.object({ path: z.string() }))
    .query(async ({ input, ctx }) => {
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `ls ${input.path}`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      return stdout;
    }),
  cat: protectedProcedureWithCredentials
    .input(z.object({ path: z.string() }))
    .query(async ({ input, ctx }) => {
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `cat ${input.path}`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      return stdout;
    }),
  head: protectedProcedureWithCredentials
    .input(z.object({ path: z.string(), lines: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `head ${input.lines ? `-n ${input.lines}` : ""} ${input.path}`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      return stdout;
    }),
  headGrep: protectedProcedureWithCredentials
    .input(
      z.object({
        path: z.string(),
        lines: z.number().optional(),
        grep: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `head ${input.lines ? `-n ${input.lines}` : ""} ${input.path} | grep "${input.grep}"`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      if (!stdout) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No matches found for ${input.grep}`,
        });
      }

      return stdout;
    }),
  rm: protectedProcedureWithCredentials
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `rm ${input.path}`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      return stdout;
    }),
});
