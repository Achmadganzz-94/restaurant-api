import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  console.log("AUTH HEADER:", authHeader ? "ADA" : "TIDAK ADA");

  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({
      message: "Akses ditolak, token tidak ditemukan",
    });
    return;
  }

  try {
    const secretKey = process.env.JWT_SECRET;

    console.log("JWT SECRET VERIFY:", secretKey ? "ADA" : "TIDAK ADA");

    if (!secretKey) {
      console.error("JWT_SECRET tidak ditemukan");

      res.status(500).json({
        message: "JWT_SECRET belum dikonfigurasi",
      });
      return;
    }

    console.log("TOKEN LENGTH:", token.length);

    const decoded = jwt.verify(token, secretKey) as {
      userId: string;
      role: string;
    };

    console.log("JWT BERHASIL:", decoded);

    req.user = decoded;

    next();
  } catch (error: any) {
    console.error("JWT VERIFY ERROR:", error?.name);

    console.error("JWT VERIFY MESSAGE:", error?.message);

    res.status(403).json({
      message: "Token tidak valid atau sudah kadaluwarsa",
    });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: "Akses ditolak: Anda tidak memiliki izin",
      });
      return;
    }

    next();
  };
};
