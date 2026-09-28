import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get All Menu
export const getMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Pagination
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 5, 1),
      50,
    );

    const skip = (page - 1) * limit;

    // Filter
    const search = ((req.query.search as string) || "").trim();
    const category = ((req.query.category as string) || "").trim();
    const status = ((req.query.status as string) || "").trim();

    // Kondisi filter
    const where: any = {};

    // Search berdasarkan nama menu
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Filter kategori
    if (category && category !== "SEMUA") {
      where.category = category;
    }

    // Filter status
    if (status && status !== "SEMUA") {
      if (status === "AVAILABLE") {
        where.isAvailable = true;
      }

      if (status === "SOLD_OUT") {
        where.isAvailable = false;
      }
    }

    // Ambil data menu + total data hasil filter
    const [menus, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.menuItem.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: menus,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal mengambil data menu",
      error: error.message,
    });
  }
};

// Get Popular Menus
export const getPopularMenus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            not: "CANCELLED",
          },
        },
      },
      include: {
        menuItem: true,
      },
    });

    const menuMap = new Map<
      string,
      {
        name: string;
        category: string;
        sold: number;
        price: number;
      }
    >();

    orderItems.forEach((item) => {
      const existing = menuMap.get(item.menuItemId);

      if (existing) {
        existing.sold += item.quantity;
      } else {
        menuMap.set(item.menuItemId, {
          name: item.menuItem.name,
          category: item.menuItem.category,
          sold: item.quantity,
          price: item.price,
        });
      }
    });

    const popularMenus = Array.from(menuMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.status(200).json({
      data: popularMenus,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal mengambil menu terlaris",
      error: error.message,
    });
  }
};

// Create Menu
export const createMenu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
      stockQty,
    } = req.body;

    const newMenu = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category: category || "MAKANAN",
        imageUrl,
        isAvailable: isAvailable ?? true,
        stockQty: stockQty ? parseInt(stockQty) : 100,
      },
    });

    res.status(201).json({
      message: "Menu berhasil ditambahkan",
      data: newMenu,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal menambahkan menu",
      error: error.message,
    });
  }
};

// Update Menu
export const updateMenu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
      stockQty,
    } = req.body;

    const updatedMenu = await prisma.menuItem.update({
      where: {
        id: id as string,
      },

      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        imageUrl,
        isAvailable,
        stockQty: stockQty ? parseInt(stockQty) : undefined,
      },
    });

    res.status(200).json({
      message: "Menu berhasil diperbarui",
      data: updatedMenu,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal memperbarui menu",
      error: error.message,
    });
  }
};

// Delete Menu
export const deleteMenu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.menuItem.delete({
      where: {
        id: id as string,
      },
    });

    res.status(200).json({
      message: "Menu berhasil dihapus",
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal menghapus menu",
      error: error.message,
    });
  }
};
export const getPOSMenus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const menus = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      data: menus,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Gagal mengambil menu POS",
      error: error.message,
    });
  }
};