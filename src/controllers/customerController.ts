import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { createCustomerSchema } from "../validations/customerScemas";

export const createCustomer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validatedData = createCustomerSchema.parse(req.body);

    // Generate kode member otomatis
    const memberCode = `MB-${Math.floor(100000 + Math.random() * 900000)}`;

    // Customer + Membership dibuat dalam satu transaction
    const customer = await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: validatedData,
      });

      await tx.membership.create({
        data: {
          customerId: newCustomer.id,
          memberCode,
          discountPercent: 10,
        },
      });

      return tx.customer.findUnique({
        where: {
          id: newCustomer.id,
        },
        include: {
          membership: true,
        },
      });
    });

    res.status(201).json({
      message: "Member berhasil didaftarkan",
      data: customer,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({
        message: "Validasi gagal",
        errors: error.errors,
      });
      return;
    }

    console.error("CREATE MEMBER ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllCustomers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        membership: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      data: customers,
    });
  } catch (error: any) {
    console.error("GET CUSTOMERS ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getCustomerOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: {
        id: id as string,
      },
    });

    if (!customer) {
      res.status(404).json({
        message: "Member tidak ditemukan",
      });
      return;
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: id as string,
      },
      include: {
        payment: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      data: orders,
    });
  } catch (error: any) {
    console.error("GET MEMBER ORDERS ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

