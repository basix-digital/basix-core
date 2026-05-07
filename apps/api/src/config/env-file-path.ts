import { resolve } from "node:path";

const unique = (paths: string[]) => Array.from(new Set(paths));

export const apiEnvFilePaths = unique([
  resolve(__dirname, "../../../..", ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(__dirname, "../..", ".env"),
]);
