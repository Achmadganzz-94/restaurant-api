import express from "express";
import authRoutes from "./routes/auth.routes";
import menuRoutes from "./routes/menu.routes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoute";
import customerRoutes from "./routes/customerRoutes";
import reportRoute from "./routes/reportRoute";
import reportsRoute from "./routes/reportadminCotrol";
import cors from "cors";

const app = express();


// Konfigurasi CORS lengkap
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reports", reportRoute);
app.use("/api/reports", reportsRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
