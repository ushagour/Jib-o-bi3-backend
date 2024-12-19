const express = require("express");
const router = express.Router();
const Joi = require("joi");
const usersStore = require("../store/users");
const validateWith = require("../middleware/validation");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const schema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});


router.post("/", validateWith(schema), (req, res) => {
  const { name, email, password } = req.body;
  if (usersStore.getUserByEmail(email))
    return res
      .status(400)
      .send({ error: "A user with the given email already exists." });

  const user = { name, email, password };
  usersStore.addUser(user);


    // Generate a token for the new user
    const token = jwt.sign({ email: user.email }, "jwtPrivateKey");

    res.status(201).json({ message: "User created", user, token });





  // res.status(201).json(user);



  console.log({
    status: res.statusCode,
    data: { message: 'User created', userData: { ...user } },
  }); 
});

router.get("/", (req, res) => {
  res.send(usersStore.getUsers());
});

// Edit user information
router.put("/:id", auth, (req, res) => {
  const userId = parseInt(req.params.id);
  // console.log("Updating user with ID:", userId);
  
  const { name, email } = req.body;

  // Find user by ID
  const user = usersStore.getUserById(userId);
  if (!user) return res.status(404).send({ error: "User not found" });

  // Validate input (simple example; for advanced, use a validation library)
  if (!name || !email) {
    return res.status(400).send({ error: "Name and email are required" });
  }


  // Update the user data
  user.name = name;
  user.email = email;

 
  // Save the updated user data
  usersStore.updateUser(userId, user);

  res.send({
    message: "User information updated successfully",
    user,
  });
});

module.exports = router;
