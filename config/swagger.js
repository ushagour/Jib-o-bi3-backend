const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Jib o Bi3 API",
      version: "1.0.0",
      description: "Documentation de l'API REST de Jib o Bi3",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
apis: ["./routes/**/*.js"],
};

module.exports = swaggerJsdoc(options);