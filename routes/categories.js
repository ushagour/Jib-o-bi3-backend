const express = require("express");
const Category = require("../models/Category");
const { Listing } = require("../models");
const auth = require("../middleware/auth"); // Import your auth middleware

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

router.get("/", async(req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async(req, res) => {
  const id = req.params.id;

  try {
    const category = await Category.findByPk(id,{
         include: [
        {
          model: Listing,
          attributes: ['id'],
        }
      ]}
    );

    res.status(200).json(category);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async(req, res) => {
  const { name, 	icon } = req.body;
  console.log("Creating new category:", { name, 	icon });
  if (!name || !icon) {
    return res.status(400).json({ error: "Name and icon are required" });
  }

  try {
    const newCategory = await Category.create({ name, icon });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async(req, res) => {
  const id = req.params.id;
  const { name, description,icon } = req.body;

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    category.name = name;
    category.description = description;
    category.icon = icon;
    await category.save();
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async(req, res) => {
  const id = req.params.id;

  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    await category.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
