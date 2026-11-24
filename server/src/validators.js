const { z } = require("zod");
const env = require("./config/env");

const httpUrl = z
  .string({ error: "url is required" })
  .trim()
  .min(1, "url is required")
  .max(2048, "url is too long")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) URL")
  .refine((v) => {
    try {
      // prevent redirect loops back into this service
      return new URL(v).host !== new URL(env.baseUrl).host;
    } catch {
      return true;
    }
  }, "You cannot shorten a link to this service");

const email = z.string({ error: "email is required" }).trim().toLowerCase().email("Enter a valid email");

const signup = z.object({
  name: z.string({ error: "name is required" }).trim().min(2, "Name must be at least 2 characters").max(80),
  email,
  password: z.string({ error: "password is required" }).min(8, "Password must be at least 8 characters").max(72),
});

const login = z.object({
  email,
  password: z.string({ error: "password is required" }).min(1, "password is required"),
});

const futureDate = z.coerce.date({ error: "Invalid expiry date" }).refine((d) => d.getTime() > Date.now(), "Expiry must be in the future");

const createUrl = z.object({
  url: httpUrl,
  alias: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  expiresAt: z.union([futureDate, z.literal("").transform(() => undefined), z.null().transform(() => undefined)]).optional(),
});

const updateUrl = z
  .object({
    isActive: z.boolean().optional(),
    expiresAt: z.union([futureDate, z.null()]).optional(),
  })
  .refine((v) => v.isActive !== undefined || v.expiresAt !== undefined, "Nothing to update");

const checkUrl = z.object({ url: httpUrl });
const ask = z.object({
  question: z.string({ error: "question is required" }).trim().min(3, "Ask a longer question").max(300, "Question is too long (max 300 characters)"),
});

module.exports = { signup, login, createUrl, updateUrl, checkUrl, ask };
