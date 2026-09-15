import { z } from "zod";

export const createOrderSchema = z.object({
  tableNumber: z.number().int().positive().optional(),

  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),

  customerId: z.string().uuid().optional(),

  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

