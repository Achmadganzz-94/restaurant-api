import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ======================================================
// SALES REPORT
// ======================================================

export const getSalesReport = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const totalTransactions = await prisma.order.count({
      where: {
        paymentStatus: "PAID",
      },
    });

    const income = await prisma.order.aggregate({
      _sum: {
        totalPrice: true,
      },

      where: {
        paymentStatus: "PAID",
      },
    });

    res.status(200).json({
      data: {
        totalPaidOrders: totalTransactions,

        totalRevenue: income._sum.totalPrice || 0,
      },
    });
  } catch (error: any) {
    console.error("SALES REPORT ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ======================================================
// TOP SELLING MENU
// ======================================================

export const getTopSellingMenu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: "PAID",
      },

      select: {
        orderItems: {
          select: {
            quantity: true,

            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const menuSales = new Map<
      string,
      {
        menuId: string;
        name: string;
        price: number;
        category: string;
        totalSold: number;
      }
    >();

    for (const order of paidOrders) {
      for (const item of order.orderItems) {
        const menu = item.menuItem;

        const existing = menuSales.get(menu.id);

        if (existing) {
          existing.totalSold += item.quantity;
        } else {
          menuSales.set(menu.id, {
            menuId: menu.id,
            name: menu.name,
            price: menu.price,
            category: menu.category,
            totalSold: item.quantity,
          });
        }
      }
    }

    const menuDetails = Array.from(menuSales.values())
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    res.status(200).json({
      data: menuDetails,
    });
  } catch (error: any) {
    console.error("TOP SELLING MENU ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
