import { z } from "zod";
import { email, phone } from "./common";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Mix letters and numbers");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
  next: z.string().optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email,
    phone: phone.optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Please accept the terms to continue" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const requestResetSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phone.optional().or(z.literal("")),
  whatsapp: phone.optional().or(z.literal("")),
  locale: z.enum(["en", "ur", "ar", "pa"]).default("en"),
  timezone: z.string().max(60).default("Asia/Karachi"),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(80).optional(),
  githubUrl: z.string().trim().url().optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;
