import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ssh } from "~/server/ssh";
import { getSSHKeys } from "~/server/ssh/utils";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";

async function createTmpScript(content: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "annotat3d-"));
  const scriptPath = path.join(tmpDir, "script.sbatch");
  await fs.writeFile(scriptPath, content);

  return { tmpDir, scriptPath };
}

export const annotat3dRouter = createTRPCRouter({
  start: protectedProcedure
    .input(
      z.object({
        partition: z.string(),
        gpus: z.number(),
        cpus: z.number(),
      }),
    )
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

      const content = [
        "#!/bin/bash",
        "#SBATCH --partition=" + input.partition,
        "#SBATCH --cpus-per-task=" + input.cpus,
        "#SBATCH --job-name=annotat3d-start",
        "#SBATCH --output=annotat3d-start-%j-%x.out",
        "#SBATCH --error=annotat3d-start-%j-%x.err",
        "#SBATCH --gres=gpu:" + input.gpus,
        "echo 'Hello from annotat3d'",
      ].join("\n");

      const { tmpDir, scriptPath } = await createTmpScript(content);
      const scriptName = "annotat3d-start.sbatch";
      await connection.putFile(scriptPath, scriptName);
      await fs.rm(tmpDir, { recursive: true });

      const { stdout, stderr } = await connection.execCommand(
        `sbatch --parsable ${scriptName}`,
      );

      if (stderr) {
        throw new Error(stderr);
      }

      const jobId = stdout.trim();
      return { jobId };
    }),
});
