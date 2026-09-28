import { Router } from "express";

import {
  getMenus,
  getPopularMenus,
  getPOSMenus,
  createMenu,
  updateMenu,
  deleteMenu,
} from "../controllers/menu.controller";

const router = Router();

router.get("/", getMenus);
router.get("/popular", getPopularMenus);
router.get("/pos", getPOSMenus);

router.post("/", createMenu);
router.put("/:id", updateMenu);
router.delete("/:id", deleteMenu);

export default router;
