import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, "ID Order wajib diisi"),
  amount: z.number().positive("Jumlah pembayaran harus lebih dari 0"),
  method: z.enum(["CASH", "TRANSFER", "QRIS"]),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
