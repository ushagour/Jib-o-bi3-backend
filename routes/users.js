const express = require("express");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");

const auth = require("../middleware/auth"); // Import your auth middleware

const router = express.Router();
const config = require("config");
const { User, Orders } = require("../models");

// Apply auth middleware to all routes
router.use(auth);

// GET all customers (updated with additional attributes)
router.get("/", async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: "customer" },
      include: [{ 
        model: Orders,
        attributes: ["id", "total_price", "createdAt"] // Include total_price and createdAt for calculations
      }],
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    if (!users || users.length === 0) {
      return res.status(404).send({ error: "No users found" });
    }

    const AvatarMapper = (file_name) => {
      const baseUrl = config.get("assetsBaseUrl");
      return `${baseUrl}${file_name}_avatar.png`;
    };

    users.forEach((user) => {
      // Handle avatar
      if (user.avatar) {
        user.avatar = AvatarMapper(user.avatar);
      } else {
        user.avatar = null;
      }
      
      // Calculate ordersCount
      user.dataValues.ordersCount = user.Orders ? user.Orders.length : 0;
      
      // Calculate totalSpent (sum of all order totals)
      user.dataValues.totalSpent = user.Orders && user.Orders.length > 0
        ? user.Orders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
        : 0;
      
      // Get lastOrder (most recent order date)
      user.dataValues.lastOrder = user.Orders && user.Orders.length > 0
        ? user.Orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
        : null;
      
      // Keep the old completedOrders for backward compatibility
      user.dataValues.completedOrders = user.Orders ? user.Orders.length : 0;
    });

    res.send(users);
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).send({ error: "An error occurred while retrieving the users" });
  }
});

// GET a single customer by ID (updated with additional attributes)
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ 
        model: Orders, 
        attributes: ["id", "total_price", "createdAt"] // Include total_price and createdAt for calculations
      }],
      attributes: { exclude: ["password"] },
    });
    
    if (!user) return res.status(404).send({ error: "User not found" });

    const AvatarMapper = (file_name) => {
      const baseUrl = config.get("assetsBaseUrl");
      return `${baseUrl}${file_name}_avatar.png`;
    };

    // Handle avatar
    if (user.avatar) {
      user.avatar = AvatarMapper(user.avatar);
    } else {
      user.avatar = null;
    }
    
    // Calculate ordersCount
    user.dataValues.ordersCount = user.Orders ? user.Orders.length : 0;
    
    // Calculate totalSpent (sum of all order totals)
    user.dataValues.totalSpent = user.Orders && user.Orders.length > 0 
      ? user.Orders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
      : 0;
    
    // Get lastOrder (most recent order date)
    user.dataValues.lastOrder = user.Orders && user.Orders.length > 0
      ? user.Orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
      : null;
    
    // Keep the old completedOrders for backward compatibility
    user.dataValues.completedOrders = user.Orders ? user.Orders.length : 0;

    res.send(user);
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).send({ error: "An error occurred while retrieving the user" });
  }
});

// CREATE a new customer
router.post("/", async (req, res) => {
  try {
    const { name, email, avatar="" } = req.body;
    
      // Check if the user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash("123456", 10);


      // console.log(req.body);
      
      // Create the user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
      role: "customer",
    });

    // console.log('user created:', hashedPassword);
    

    res.status(201).send({ message: "User created", user });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "An error occurred while creating the user" });
  }
});

// UPDATE a customer
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send({ error: "User not found" });

    Object.assign(user, req.body);//copy the properties from req.body to user object
    await user.save();

    res.send({ message: "User updated", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ error: "An error occurred while updating the user" });
  }
});

// DELETE a customer
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send({ error: "User not found" });

    await user.destroy();
    res.send({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "An error occurred while deleting the user" });
  }
});

module.exports = router;
