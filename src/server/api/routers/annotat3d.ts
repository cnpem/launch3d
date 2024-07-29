import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ssh } from "~/server/ssh";
import { getSSHKeys } from "~/server/ssh/utils";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { jobName, jobLogName } from "~/lib/constants";
import {
  imagePathSchema,
  annotationPathSchema,
  outputDirSchema,
} from "~/lib/schemas/form-input-paths";

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
      // input paths for images, labels, superpixels, and annotations
      imagePath: imagePathSchema,
      labelPath: imagePathSchema.optional(),
      superpixelPath: imagePathSchema.optional(),
      annotationPath: annotationPathSchema.optional(),
      // output directory for saving results
      outputDir: outputDirSchema,
        partition: z.string(),
        gpus: z.string(),
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

      const templatePath = "public/templates/annotat3d-sbatch.sh";
      const scriptTemplate = await fs.readFile(templatePath, "utf-8");

      const content = scriptTemplate
        .replace("${INPUT_IMAGE_PATH}", input.imagePath)
        .replace("${INPUT_LABEL_PATH}", input.labelPath ?? "")
        .replace("${INPUT_ANNOTATION_PATH}", input.annotationPath ?? "")
        .replace("${INPUT_SUPERPIXEL_PATH}", input.superpixelPath ?? "")
        .replace("${INPUT_OUTPUT_PATH}", input.outputDir)
        .replace("${INPUT_PARTITION}", input.partition)
        .replace("${INPUT_CPUS}", input.cpus.toString())
        .replace("${INPUT_GPUS}", input.gpus)
        .replace("${ENV_ANNOTAT3D_JOB_NAME}", jobName)
        .replace("${ENV_ANNOTAT3D_LOG_OUT}", `${jobLogName}.out`)
        .replace("${ENV_ANNOTAT3D_LOG_ERR}", `${jobLogName}.err`)
        .replace("${ENV_ANNOTAT3D_CONTAINER_PATH}", env.ANNOTAT3D_CONTAINER_PATH)
        .replace("${ENV_ANNOTAT3D_PORT_RANGE0}", env.ANNOTAT3D_PORT_RANGE0)
        .replace("${ENV_ANNOTAT3D_PORT_RANGE1}", env.ANNOTAT3D_PORT_RANGE1);

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
