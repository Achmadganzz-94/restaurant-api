import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z.string().min(2, 'Nama menu minimal 2 karakter'),
  category: z.string().min(2, 'Kategori wajib diisi (misal: Makanan, Minuman)'),
  price: z.number().positive('Harga harus angka positif'),
  description: z.string().optional(),
  isAvailable: z.boolean().optional().default(true),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;