import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  MERCHANT_WALLET_ADDRESS: z
    .string()
    .min(1, "MERCHANT_WALLET_ADDRESS is required")
    .regex(/^0x[0-9a-fA-F]{40}$/, "MERCHANT_WALLET_ADDRESS must be a valid EVM address"),
  FRONTEND_ORIGIN: z
    .string()
    .min(1, "FRONTEND_ORIGIN is required")
    .url("FRONTEND_ORIGIN must be a valid URL"),
  PORT: z.string().optional().default("3001"),
  LENDING_CONTRACT_ADDRESS: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^0x[0-9a-fA-F]{40}$/.test(v),
      "LENDING_CONTRACT_ADDRESS must be a valid EVM address"
    ),
  LENDING_SIGNER_PRIVATE_KEY: z
    .string()
    .optional()
    .default(""),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

export const env = loadEnv();
