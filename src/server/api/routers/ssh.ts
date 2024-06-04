import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import { ssh } from "~/server/ssh";
import { env } from "~/env";
import { getSSHKeys } from "~/server/ssh/utils";

export const sshRouter = createTRPCRouter({
  ls: protectedProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input, ctx }) => {
      const name = ctx.session.user.name;
      if (!name) {
        throw new Error("No user found");
      }
      const keys = getSSHKeys(name);
      if (!keys) {
        throw new Error("No keys found for user");
      }

      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: name,
        privateKey: keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `ls ${input.path}`;
      const { stdout, stderr } = await connection.execCommand(command);

      if (stderr) {
        throw new Error(stderr);
      }

      return stdout;
    }),
});
