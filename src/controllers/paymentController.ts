import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { createPaymentSchema } from "../validations/paymentSchema";

export const createPayment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validatedData = createPaymentSchema.parse(req.body);

    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "User tidak terautentikasi",
      });
      return;
    }

    // ==============================================
    // CARI ORDER
    // ==============================================

    const order = await prisma.order.findUnique({
      where: {
        id: validatedData.orderId,
      },

      include: {
        payment: true,
      },
    });

    if (!order) {
      res.status(404).json({
        message: "Order tidak ditemukan",
      });
      return;
    }

    // ==============================================
    // CEK SUDAH DIBAYAR
    // ==============================================

    if (order.paymentStatus === "PAID") {
      res.status(400).json({
        message: "Order ini sudah dibayar sebelumnya",
      });
      return;
    }

    // ==============================================
    // CEK NOMINAL
    // ==============================================

    if (validatedData.amount < order.totalPrice) {
      res.status(400).json({
        message: `Jumlah pembayaran kurang. Total tagihan: Rp${order.totalPrice}`,
      });
      return;
    }

    // ==============================================
    // HITUNG KEMBALIAN
    // ==============================================

    const changeAmount = validatedData.amount - order.totalPrice;

    // ==============================================
    // TRANSACTION
    // ==============================================

   const result = await prisma.$transaction(async (tx) => {
     const newPayment = await tx.payment.create({
       data: {
         orderId: validatedData.orderId,
         amount: order.totalPrice,
         payAmount: validatedData.amount,
         changeAmount,
         method: validatedData.method,
         receivedById: userId,
       },
     });

     const updatedOrder = await tx.order.update({
       where: { id: validatedData.orderId },
       data: { paymentStatus: "PAID" },
     });

     // Tambahkan loyalty points jika order memiliki customer
     if (order.customerId) {
       const earnedPoints = Math.floor(order.totalPrice / 10000);

       if (earnedPoints > 0) {
         await tx.customer.update({
           where: {
             id: order.customerId,
           },
           data: {
             points: {
               increment: earnedPoints,
             },
           },
         });
       }
     }

     return {
       payment: newPayment,
       order: updatedOrder,
     };
   });

    res.status(201).json({
      message: "Pembayaran berhasil dicatat",

      data: result,
    });
  } catch (error: any) {
    console.error("CREATE PAYMENT ERROR:", error);

    if (error.name === "ZodError") {
      res.status(400).json({
        message: "Validasi gagal",
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
