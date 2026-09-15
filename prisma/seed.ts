import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  
  const hashedPassword = await bcrypt.hash("password123", 10);



  const admin = await prisma.user.upsert({
    where: { email: "admin@restaurant.com" },
    update: {},
    create: {
      name: "Admin Resto",
      email: "admin@restaurant.com",
      passwordHash: hashedPassword,
      role: Role.ADMIN,
    },
  });



  const staff = await prisma.user.upsert({
    where: { email: "staff@restaurant.com" },
    update: {},
    create: {
      name: "Kasir Staff",
      email: "staff@restaurant.com",
      passwordHash: hashedPassword,
      role: Role.STAFF,
    },
  });

  console.log("User Seeded:", { admin: admin.email, staff: staff.email });



  const menuCount = await prisma.menuItem.count();
  if (menuCount === 0) {
    await prisma.menuItem.createMany({
      data: [
        { name: "Nasi Goreng Special", category: "Makanan", price: 25000 },
        { name: "Ayam Bakar Madu", category: "Makanan", price: 30000 },
        { name: "Es Teh Manis", category: "Minuman", price: 5000 },
        { name: "Jus Alpukat", category: "Minuman", price: 12000 },
      ],
    });
    console.log("Sample Menu Items Seeded!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
