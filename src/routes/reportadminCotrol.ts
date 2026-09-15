import { Router } from "express";
import { getReports } from "../controllers/reportsadminController";

const router = Router();

router.get("/", getReports);

export default router;
