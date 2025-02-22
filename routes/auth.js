const express = require("express");
const router = express.Router();
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const validateWith = require("../middleware/validation");
const config = require("config");


const Loginschema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});

const Registerschema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(5),
});



// login route
router.post("/login", validateWith(Loginschema), (req, res) => {
  const { email, password } = req.body;

 


  
  const token = jwt.sign(
    {},
    "jwtPrivateKey"
  );
});


// register route
router.post("/register", validateWith(Registerschema), async (req, res) => {
  const { name, email, password } = req.body;
  const token = jwt.sign(
    { userId: newUser.id, name: newUser.name, email: newUser.email },
    "jwtPrivateKey"
  );

});






module.exports = router;
