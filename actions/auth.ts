"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { AuthError } from "next-auth";

export async function register(input: RegisterInput) {
  const validated = registerSchema.safeParse(input);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { name, email, password } = validated.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
      credits: { text: 100, image: 10 },
    },
  });

  await signIn("credentials", { email, password, redirect: false });

  return { success: true };
}

export async function login(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}
