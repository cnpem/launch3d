import { z } from "zod";

export const validImageExtensions = [
  "tif",
  "tiff",
  "TIFF",
  "hdf5",
  "h5",
  "raw",
  "b",
] as const;
export const validAnnotationExtensions = ["pkl"] as const;

export const imagePathSchema = z
  .string()
  .min(2, { message: "Must be a valid image name!" })
  .refine(
    (value) => {
      const extension = value.split(".").pop();
      return validImageExtensions.includes(
        extension as (typeof validImageExtensions)[number],
      );
    },
    {
      message: `Image file must be one of the following types: ${validImageExtensions.join(', ')}`,
    },
  );

export const annotationPathSchema = z
  .string()
  .min(2, { message: "Must be a valid annotation name!" })
  .endsWith(validAnnotationExtensions[0], {
    message: "Annotation file must be a .pkl file!",
  });

export const outputDirSchema = z
  .string()
  .min(2, { message: "Must be a valid workspace directory!" })
  .endsWith("/", {
    message: "Must be a valid workspace directory!",
  });
