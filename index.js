const express = require("express");
const categories = require("./routes/categories");
const listings = require("./routes/listings");
const user = require("./routes/user");
const stats = require("./routes/stats");
const users = require("./routes/users");
const auth = require("./routes/auth");
const reviews = require("./routes/reviews");
const messages = require("./routes/messages");
const orders = require("./routes/orders");
const expoPushTokens = require("./routes/expoPushTokens");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
const app = express();
const { sequelize } = require('./models');

require('dotenv').config();

const cors = require('cors');
// Enable CORS for all origins
app.use(cors());

// Or, allow only your frontend origin:

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(helmet());
app.use(compression());

app.use("/api/categories", categories);
app.use("/api/listings", listings);
app.use("/api/user", user);
app.use("/api/orders", orders);
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/expoPushTokens", expoPushTokens);
app.use("/api/messages", messages);
app.use("/api/reviews", reviews);
app.use("/api/stats", stats);



// Sync database and start server
sequelize.sync().then(() => {
    const PORT = process.env.PORT || config.get("port");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});



