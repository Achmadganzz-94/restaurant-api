import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ======================================================
// DASHBOARD
// ======================================================

export const getDashboard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // ==================================================
    // TODAY
    // ==================================================

    const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();

    endOfToday.setHours(23, 59, 59, 999);

    // ==================================================
    // PENJUALAN HARI INI
    // ==================================================

    const todaySales = await prisma.order.aggregate({
      _sum: {
        totalPrice: true,
      },

      where: {
        paymentStatus: "PAID",

        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // ==================================================
    // PESANAN HARI INI
    // ==================================================

    const todayOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // ==================================================
    // ORDER PREPARING
    // ==================================================

    const preparingOrders = await prisma.order.count({
      where: {
        status: "PREPARING",
      },
    });

    // ==================================================
    // MENU
    // ==================================================

    const totalMenus = await prisma.menuItem.count();

    const availableMenus = await prisma.menuItem.count({
      where: {
        isAvailable: true,
      },
    });

    // ==================================================
    // ORDER STATUS
    // ==================================================

    const [pending, preparing, ready, served, completed] = await Promise.all([
      prisma.order.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.order.count({
        where: {
          status: "PREPARING",
        },
      }),

      prisma.order.count({
        where: {
          status: "READY",
        },
      }),

      prisma.order.count({
        where: {
          status: "SERVED",
        },
      }),

      prisma.order.count({
        where: {
          status: "COMPLETED",
        },
      }),
    ]);

    // ==================================================
    // SALES CHART 7 HARI
    // ==================================================

    const salesChart = [];

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(date.getDate() - i);

      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);

      nextDate.setDate(nextDate.getDate() + 1);

      const sales = await prisma.order.aggregate({
        _sum: {
          totalPrice: true,
        },

        where: {
          paymentStatus: "PAID",

          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      salesChart.push({
        day: dayNames[date.getDay()],

        sales: sales._sum.totalPrice || 0,
      });
    }

    // ==================================================
    // POPULAR MENU
    // ==================================================

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
        category: string;
        price: number;
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

            category: menu.category,

            price: menu.price,

            totalSold: item.quantity,
          });
        }
      }
    }

    const popularMenus = Array.from(menuSales.values())
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // ==================================================
    // RECENT ORDERS
    // ==================================================

    const recentOrders = await prisma.order.findMany({
      take: 5,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        customer: {
          select: {
            name: true,
          },
        },

        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(200).json({
      success: true,

      data: {
        todaySales: todaySales._sum.totalPrice || 0,

        todayOrders,

        preparingOrders,

        availableMenus,

        totalMenus,

        salesChart,

        orderStatus: {
          pending,
          preparing,
          ready,
          served,
          completed,
        },

        popularMenus,

        recentOrders,
      },
    });
  } catch (error: any) {
    console.error("DASHBOARD ERROR:", error);

    res.status(500).json({
      success: false,

      message: "Gagal mengambil data dashboard",

      error: error.message,
    });
  }
};
