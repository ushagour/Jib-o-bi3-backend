const express = require("express");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const { AdminActivity } = require("../models");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(limitParam)
      ? Math.min(Math.max(limitParam, 1), 200)
      : 50;

    const entitiesParam = typeof req.query.entities === "string" ? req.query.entities : "";
    const entities = entitiesParam
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => ["user", "listing", "review"].includes(item));

    const where = entities.length ? { entity: { [Op.in]: entities } } : {};

    const activities = await AdminActivity.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
    });

    res.json(activities);
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({ error: "Failed to fetch admin notifications" });
  }
});

module.exports = router;