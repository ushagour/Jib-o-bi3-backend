module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);  // Call the validate method on the Joi schema

  if (error) {
    console.log(error);
    
    return res.status(400).send({ error: error.details[0].message });
  }

  next();  // Proceed if no validation errors
  
};
