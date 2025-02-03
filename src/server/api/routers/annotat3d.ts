import { env } from "~/env";
import { createTRPCRouter, protectedProcedureWithCredentials } from "../trpc";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { jobName, jobLogName } from "~/lib/constants";
import {
  imagePathSchema,
  annotationPathSchema,
  outputDirSchema,
  classModelPathSchema,
} from "~/lib/schemas/form-input-paths";

async function createTmpScript(content: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "annotat3d-"));
  const scriptPath = path.join(tmpDir, "script.sbatch");
  await fs.writeFile(scriptPath, content);

  return { tmpDir, scriptPath };
}

export const annotat3dRouter = createTRPCRouter({
  start: protectedProcedureWithCredentials
    .input(
      z.object({
        imagePath: imagePathSchema,
        labelPath: imagePathSchema.optional(),
        superpixelPath: imagePathSchema.optional(),
        annotationPath: annotationPathSchema.optional(),
        classModelPath: classModelPathSchema.optional(),
        outputDir: outputDirSchema,
        partition: z.string(),
        gpus: z.coerce.number().min(1),
        cpus: z.coerce.number().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = ctx.session.connection;
      const username = ctx.session.credentials.name;

      const templatePath = "public/templates/annotat3d-sbatch.sh";
      const scriptTemplate = await fs.readFile(templatePath, "utf-8");

      const content = scriptTemplate
        .replace("${USERNAME}", username)
        .replace("${INPUT_IMAGE_PATH}", input.imagePath)
        .replace("${INPUT_LABEL_PATH}", input.labelPath ?? "")
        .replace("${INPUT_ANNOTATION_PATH}", input.annotationPath ?? "")
        .replace("${INPUT_SUPERPIXEL_PATH}", input.superpixelPath ?? "")
        .replace("${INPUT_CLASS_MODEL_PATH}", input.classModelPath ?? "")
        .replace("${INPUT_OUTPUT_PATH}", input.outputDir)
        .replace("${INPUT_PARTITION}", input.partition)
        .replace("${INPUT_CPUS}", input.cpus.toString())
        .replace("${INPUT_GPUS}", input.gpus.toString())
        .replace("${ENV_ANNOTAT3D_JOB_NAME}", jobName)
        .replace("${ENV_ANNOTAT3D_LOG_OUT}", `${jobLogName}.out`)
        .replace("${ENV_ANNOTAT3D_LOG_ERR}", `${jobLogName}.err`)
        .replace(
          "${ENV_ANNOTAT3D_CONTAINER_PATH}",
          env.ANNOTAT3D_CONTAINER_PATH,
        )
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
