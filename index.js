const express = require("express");
const categories = require("./routes/categories");
const listings = require("./routes/listings");
const users = require("./routes/users");
const user = require("./routes/user");
const auth = require("./routes/auth");
const messages = require("./routes/messages");
const expoPushTokens = require("./routes/expoPushTokens");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
const app = express();
const { sequelize } = require('./models');

app.use(express.static("public"));
app.use(express.json());
app.use(helmet());
app.use(compression());

app.use("/api/categories", categories);
app.use("/api/listings", listings);
app.use("/api/user", user);
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/expoPushTokens", expoPushTokens);
app.use("/api/messages", messages);


// Sync database and start server
sequelize.sync().then(() => {
    const PORT = process.env.PORT || config.get("port");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});



