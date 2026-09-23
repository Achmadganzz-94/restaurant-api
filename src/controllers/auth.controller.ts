import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { registerSchema, loginSchema } from "../validations/auth.schema";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      res.status(400).json({ message: "Email sudah terdaftar" });
      return;
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash: hashedPassword,
        role: validatedData.role || "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "Registrasi berhasil",
      data: newUser,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({ message: "Validasi gagal", errors: error.errors });
      return;
    }
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      res.status(400).json({ message: "Email atau password salah" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      res.status(400).json({ message: "Email atau password salah" });
      return;
    }

    const secretKey = process.env.JWT_SECRET || "";
    const token = jwt.sign({ userId: user.id, role: user.role }, secretKey, {
      expiresIn: "1d",
    });

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("DETAILED LOGIN ERROR:", error);
    if (error.name === "ZodError") {
      res.status(400).json({ message: "email/password tidak valid", errors: error.errors });
      return;
    }
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getAllStaff = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      message: "Berhasil mengambil data staf",
      data: staff,
    });
  } catch (error: any) {
    console.error("DETAILED GET STAFF ERROR:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Update Data Staf
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id : id as string },
      data: { name, email, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    res.status(200).json({ message: "Staf berhasil diperbarui", data: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: "Gagal memperbarui staf", error: error.message });
  }
};

// Hapus Staf
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id: id as string } });

    res.status(200).json({ message: "Staf berhasil dihapus" });
  } catch (error: any) {
    res.status(500).json({ message: "Gagal menghapus staf", error: error.message });
  }
};
