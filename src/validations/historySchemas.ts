import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const updateOrderStatusWithHistorySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
});

export type UpdateOrderStatusWithHistoryInput = z.infer<
  typeof updateOrderStatusWithHistorySchema
>;
