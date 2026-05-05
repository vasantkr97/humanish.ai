import { z } from "zod";

// File operation schemas
export const FileOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createFile"),
    path: z.string().describe("File path relative to project root"),
    content: z.string().describe("Complete file content"),
  }),
  z.object({
    type: z.literal("rewriteFile"),
    path: z.string().describe("File path to rewrite"),
    content: z.string().describe("New complete file content"),
  }),
  z.object({
    type: z.literal("updateFile"),
    path: z.string().describe("File path to update"),
    searchReplace: z
      .preprocess(
        (val) => {
          if (!Array.isArray(val)) return val;
          // Gemini sometimes returns searchReplace as a flat string pair:
          //   ["old code", "new code"]  ← wrong
          // instead of the correct object format:
          //   [{search: "old code", replace: "new code"}]  ← correct
          // Detect this and normalize automatically.
          if (val.length > 0 && typeof val[0] === "string") {
            const result: { search: string; replace: string }[] = [];
            for (let i = 0; i + 1 < val.length; i += 2) {
              result.push({
                search: val[i] as string,
                replace: val[i + 1] as string,
              });
            }
            return result;
          }
          return val;
        },
        z
          .array(
            z.object({
              search: z.string().describe("Text to search for"),
              replace: z.string().describe("Text to replace with"),
            })
          )
          .describe("Array of search/replace operations")
      ),
  }),
  z.object({
    type: z.literal("deleteFile"),
    path: z.string().describe("File path to delete"),
  }),
]);

// Generation schema for AI output
export const GenerationSchema = z.object({
  fileOperations: z
    .array(FileOperationSchema)
    .describe("Array of file operations to execute in order"),
  shellCommands: z
    .array(z.string())
    .describe("Shell commands to run (e.g., npm install package-name)"),
  explanation: z
    .string()
    .describe("Brief explanation of what was created or modified"),
});

// Export types
export type FileOperation = z.infer<typeof FileOperationSchema>;
export type GenerateOutput = z.infer<typeof GenerationSchema>;
