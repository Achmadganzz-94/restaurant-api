import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  phone: z.string().min(8, "Nomor telepon minimal 8 karakter"),
  email: z.string().email("Format email tidak valid").optional(),
  address: z.string().optional(),
});

export const createMembershipSchema = z.object({
  customerId: z.string().min(1, "ID Customer wajib diisi"),
  discountPercent: z.number().min(0).max(100).default(10),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;