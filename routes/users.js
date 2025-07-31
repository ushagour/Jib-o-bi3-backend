
const express = require("express");
const app = express();
app.use(express.json()); // Middleware to parse JSON request body

const router = express.Router();

const config = require("config");

const { User, Orders } = require("../models");
const auth = require("../middleware/auth");


router.get("/", async (req, res) => {
  try {
    const users = await User.findAll({
      EXCLUDE: ["password"], // Exclude password from the response
      where: {
        role: "customer"
      },
      include: [
        {
          model: Orders,
          attributes: ["id"],
        }
      ],
      order: [["createdAt", "DESC"]]

    });

    if (!users || users.length === 0) {
      return res.status(404).send({ error: "No users found" });
    }

    const AvatarMapper = file_name => {
      const baseUrl = config.get("assetsBaseUrl");
    
      return  `${baseUrl}${file_name}_avatar.jpg`;

    }

 

    res.send(users);
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).send({ error: "An error occurred while retrieving the users" });
  }
}
);



module.exports = router;
