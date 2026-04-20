import { Router } from "express";
import leagueBaseRoutes from "./league-base.js";
import leagueDraftRoutes from "./league-draft.js";

const router = Router();

router.use(leagueBaseRoutes);
router.use(leagueDraftRoutes);

export default router;
