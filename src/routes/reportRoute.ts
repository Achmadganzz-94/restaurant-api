import { Router } from "express";
import {
  getSalesReport,
  getTopSellingMenu,
} from "../controllers/reportController";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/sales", getSalesReport);
router.get("/top-menu", getTopSellingMenu);

export default router;
