import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ssh } from "~/server/ssh";
import { getSSHKeys } from "~/server/ssh/utils";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { jobName, jobLogName } from "~/lib/constants";

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
        gpus: z.coerce.number(),
        cpus: z.coerce.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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

      const templatePath = 'public/templates/annotat3d-sbatch.sh';
      const scriptTemplate = await fs.readFile(templatePath, 'utf-8');

      const content = scriptTemplate
        .replace('${INPUT_PARTITION}', input.partition)
        .replace('${INPUT_CPUS}', input.cpus.toString())
        .replace('${INPUT_GPUS}', input.gpus.toString())
        .replace('${ENV_ANNOTAT3D_JOB_NAME}', jobName)
        .replace('${ENV_ANNOTAT3D_LOG_OUT}', `${jobLogName}.out`)
        .replace('${ENV_ANNOTAT3D_LOG_ERR}', `${jobLogName}.err`)
        .replace('${ENV_ANNOTAT3D_IMAGE_PATH}', env.ANNOTAT3D_IMAGE_PATH)
        .replace('${ENV_ANNOTAT3D_PORT_RANGE0}', env.ANNOTAT3D_PORT_RANGE0)
        .replace('${ENV_ANNOTAT3D_PORT_RANGE1}', env.ANNOTAT3D_PORT_RANGE1);

      const { tmpDir, scriptPath } = await createTmpScript(content);
      const scriptName = `${jobName}.sbatch`;
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
