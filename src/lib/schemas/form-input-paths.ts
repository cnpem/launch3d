import { z } from "zod";

export const imagePathSchema = z
  .string()
  .min(2, { message: "Must be a valid image name!" })
  .regex(/^.*\.(tif|tiff|TIFF|hdf5|h5|raw|b)$/, {
    message: "Must be a valid image extension!",
  });

export const annotationPathSchema = z
  .string()
  .min(2, { message: "Must be a valid annotation name!" })
  .regex(/^.*\.(pkl)$/, {
    message: "Must be a valid annotation extension!",
  });

export const outputDirSchema = z
  .string()
  .min(2, { message: "Must be a valid workspace directory!" })
  .regex(/\/$/, {
    message: "Must be a valid workspace directory!",
  });
