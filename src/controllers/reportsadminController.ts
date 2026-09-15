import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ======================================================
// REPORTS
// ======================================================

export const getReports = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    // Default: semua data jika tanggal tidak diberikan
    const dateFilter: any = {};

    if (startDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00`);
    }

    if (endDate) {
      const end = new Date(`${endDate}T00:00:00`);
      end.setDate(end.getDate() + 1);

      dateFilter.lt = end;
    }

    const whereOrder: any = {
      paymentStatus: "PAID",
    };

    if (startDate || endDate) {
      whereOrder.createdAt = dateFilter;
    }

    // ======================================================
    // AMBIL DATA ORDER
    // ======================================================

    const orders = await prisma.order.findMany({
      where: whereOrder,
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        payment: true,
        customer: {
          include: {
            membership: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // ======================================================
    // RINGKASAN
    // ======================================================

    const totalTransactions = orders.length;

    const totalRevenue = orders.reduce(
      (total, order) => total + order.totalPrice,
      0,
    );

    const totalDiscount = orders.reduce(
      (total, order) => total + order.discount,
      0,
    );

    const averageTransaction =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // ======================================================
    // PENJUALAN PER HARI
    // ======================================================

    const dailySalesMap = new Map<
      string,
      {
        date: string;
        transactions: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      const date = order.createdAt.toISOString().split("T")[0];

      const existing = dailySalesMap.get(date);

      if (existing) {
        existing.transactions += 1;
        existing.revenue += order.totalPrice;
      } else {
        dailySalesMap.set(date, {
          date,
          transactions: 1,
          revenue: order.totalPrice,
        });
      }
    }

    const dailySales = Array.from(dailySalesMap.values());

    // ======================================================
    // TOP MENU
    // ======================================================

    const menuSalesMap = new Map<
      string,
      {
        menuId: string;
        name: string;
        category: string;
        totalSold: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.orderItems) {
        const menu = item.menuItem;

        const itemRevenue = item.price * item.quantity;

        const existing = menuSalesMap.get(menu.id);

        if (existing) {
          existing.totalSold += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          menuSalesMap.set(menu.id, {
            menuId: menu.id,
            name: menu.name,
            category: menu.category,
            totalSold: item.quantity,
            revenue: itemRevenue,
          });
        }
      }
    }

    const topMenus = Array.from(menuSalesMap.values())
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    // ======================================================
    // METODE PEMBAYARAN
    // ======================================================

    const paymentMap = new Map<
      string,
      {
        method: string;
        transactions: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      if (!order.payment) continue;

      const method = order.payment.method;

      const existing = paymentMap.get(method);

      if (existing) {
        existing.transactions += 1;
        existing.revenue += order.totalPrice;
      } else {
        paymentMap.set(method, {
          method,
          transactions: 1,
          revenue: order.totalPrice,
        });
      }
    }

    const paymentMethods = Array.from(paymentMap.values());

    // ======================================================
    // MEMBER VS NON-MEMBER
    // ======================================================

    let memberTransactions = 0;
    let nonMemberTransactions = 0;

    let memberRevenue = 0;
    let nonMemberRevenue = 0;

    for (const order of orders) {
      if (order.customer?.membership?.isActive) {
        memberTransactions += 1;
        memberRevenue += order.totalPrice;
      } else {
        nonMemberTransactions += 1;
        nonMemberRevenue += order.totalPrice;
      }
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    res.status(200).json({
      data: {
        summary: {
          totalRevenue,
          totalTransactions,
          totalDiscount,
          averageTransaction,
        },

        dailySales,

        topMenus,

        paymentMethods,

        membership: {
          memberTransactions,
          nonMemberTransactions,
          memberRevenue,
          nonMemberRevenue,
        },
      },
    });
  } catch (error: any) {
    console.error("REPORTS ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
