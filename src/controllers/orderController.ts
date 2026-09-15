import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { updateOrderStatusWithHistorySchema } from "../validations/historySchemas";
import { createOrderSchema } from "../validations/orderSchema";

// ======================================================
// CREATE ORDER
// ======================================================

export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validatedData = createOrderSchema.parse(req.body);

    // ==================================================
    // AMBIL USER DARI JWT
    // ==================================================

    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "User tidak terautentikasi",
      });
      return;
    }

    // ==================================================
    // AMBIL SEMUA ID MENU
    // ==================================================

    const menuItemIds = validatedData.items.map(
      (item: { menuItemId: string; quantity: number }) => item.menuItemId,
    );

    // ==================================================
    // CARI MENU
    // ==================================================

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: menuItemIds,
        },
      },
    });

    // Pastikan semua menu ditemukan
    if (menuItems.length !== menuItemIds.length) {
      res.status(400).json({
        message: "Salah satu atau lebih menu item tidak ditemukan",
      });
      return;
    }

    // ==================================================
    // HITUNG SUBTOTAL
    // ==================================================

    let subtotal = 0;

    const orderItemsData = validatedData.items.map(
      (item: { menuItemId: string; quantity: number }) => {
        const menuItem = menuItems.find((menu) => menu.id === item.menuItemId);

        if (!menuItem) {
          throw new Error("Menu tidak ditemukan");
        }

        const price = menuItem.price;

        subtotal += price * item.quantity;

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price,
        };
      },
    );

    // ==================================================
    // HITUNG DISKON MEMBER
    // ==================================================
    //
    // Customer yang memiliki Membership:
    // mendapatkan diskon 10%
    //
    // Customer tanpa Membership:
    // tidak mendapatkan diskon
    //
    // Diskon dihitung oleh backend agar tidak bisa
    // dimanipulasi oleh frontend.
    // ==================================================

    let discount = 0;

    if (validatedData.customerId) {
      const customer = await prisma.customer.findUnique({
        where: {
          id: validatedData.customerId,
        },
        include: {
          membership: true,
        },
      });

      // Customer ID dikirim tetapi tidak ditemukan
      if (!customer) {
        res.status(400).json({
          message: "Customer tidak ditemukan",
        });
        return;
      }

      // Customer memiliki membership
      if (customer.membership) {
        discount = Math.floor(subtotal * 0.1);
      }
    }

    // ==================================================
    // HITUNG TOTAL AKHIR
    // ==================================================

    const totalPrice = Math.max(0, subtotal - discount);

    // ==================================================
    // GENERATE ORDER NUMBER
    // ==================================================

    const now = new Date();

    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(now.getDate()).padStart(2, "0")}`;

    const randomNumber = Math.floor(100 + Math.random() * 900);

    const orderNumber = `ORD-${date}-${randomNumber}`;

    // ==================================================
    // CREATE ORDER
    // ==================================================

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,

        tableNumber: validatedData.tableNumber,

        orderType: validatedData.orderType ?? "DINE_IN",

        customerId: validatedData.customerId ?? undefined,

        subtotal,

        discount,

        totalPrice,

        userId,

        orderItems: {
          create: orderItemsData,
        },
      },

      include: {
        customer: {
          include: {
            membership: true,
          },
        },

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(201).json({
      message: "Pesanan berhasil dibuat",
      data: newOrder,
    });
  } catch (error: any) {
    console.error("CREATE ORDER ERROR:", error);

    // ==================================================
    // ZOD VALIDATION ERROR
    // ==================================================

    if (error.name === "ZodError") {
      res.status(400).json({
        message: "Validasi gagal",
        errors: error.errors,
      });
      return;
    }

    // ==================================================
    // INTERNAL SERVER ERROR
    // ==================================================

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL ORDERS
// ======================================================

export const getAllOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: {
          include: {
            membership: true,
          },
        },

        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        orderItems: {
          include: {
            menuItem: true,
          },
        },

        payment: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      data: orders,
    });
  } catch (error: any) {
    console.error("GET ORDERS ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE ORDER STATUS
// ======================================================

export const updateOrderStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const validatedData = updateOrderStatusWithHistorySchema.parse(req.body);

    // ==================================================
    // AMBIL USER DARI JWT
    // ==================================================

    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "User tidak terautentikasi",
      });
      return;
    }

    // ==================================================
    // CEK ORDER
    // ==================================================

    const orderExists = await prisma.order.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!orderExists) {
      res.status(404).json({
        message: "Pesanan tidak ditemukan",
      });
      return;
    }

    // ==================================================
    // UPDATE STATUS + HISTORY
    // ==================================================

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: {
          id: String(id),
        },

        data: {
          status: validatedData.status,
        },
      });

      const historyLog = await tx.orderStatusHistory.create({
        data: {
          orderId: String(id),

          status: validatedData.status,

          changedById: userId,

          note: validatedData.note || null,
        },
      });

      return {
        updatedOrder,
        historyLog,
      };
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(200).json({
      message: "Status pesanan berhasil diperbarui dan dicatat di histori",

      data: result,
    });
  } catch (error: any) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    // ==================================================
    // ZOD VALIDATION ERROR
    // ==================================================

    if (error.name === "ZodError") {
      res.status(400).json({
        message: "Validasi gagal",
        errors: error.errors,
      });
      return;
    }

    // ==================================================
    // INTERNAL SERVER ERROR
    // ==================================================

    res.status(500).json({
      message: "Gagal memperbarui status pesanan",
      error: error.message,
    });
  }
};

// ======================================================
// GET ORDER HISTORY
// ======================================================

export const getOrderStatusHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // ==================================================
    // AMBIL HISTORY
    // ==================================================

    const history = await prisma.orderStatusHistory.findMany({
      where: {
        orderId: String(id),
      },

      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },

      orderBy: {
        changedAt: "desc",
      },
    });

    // ==================================================
    // RESPONSE
    // ==================================================

    res.status(200).json({
      data: history,
    });
  } catch (error: any) {
    console.error("GET ORDER HISTORY ERROR:", error);

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
