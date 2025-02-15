const express = require("express");
const router = express.Router();
const db = require('../database/database');

router.get("/", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) {
      console.error("Error fetching categories:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.send(rows);
  });
});

router.get("/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM categories WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching category:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    if (!row) {
      res.status(404).send("Category not found");
      return;
    }
    res.send(row);
  });
});

module.exports = router;
