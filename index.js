const express = require("express");
const categories = require("./routes/categories");
const listings = require("./routes/listings");
const listing = require("./routes/listing");
const users = require("./routes/users");
const user = require("./routes/user");
const auth = require("./routes/auth");
const my_Listings = require("./routes/my_Listings");
const my_Notifications = require("./routes/my_Notifications");
const expoPushTokens = require("./routes/expoPushTokens");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
const app = express();
const { User, Category, Listing, Image, sequelize } = require('./models');
const bcrypt = require("bcrypt");

app.use(express.static("public"));
app.use(express.json());
app.use(helmet());
app.use(compression());

app.use("/api/categories", categories);
app.use("/api/listing", listing);
app.use("/api/listings", listings);
app.use("/api/user", user);
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/my_Listings", my_Listings);
app.use("/api/expoPushTokens", expoPushTokens);
app.use("/api/my_Notifications", my_Notifications);




// Example: Create a new user
async function createUser() {
    const user = await User.create({
        name: 'john_doe',
        email: 'john@example.com',
        password:  bcrypt.hashSync('password123', 10), 
    });
    console.log(user);
}

// Example: Fetch all listings with their images
async function getListings() {
    const listings = await Listing.findAll({
        include: [{ model: Image, as: 'images' }], // Use the same alias 'images'
    });
    console.log(listings);
}

// Sync models with the database
sequelize.sync().then(() => {
    console.log('Database synced!');
    // createUser();
    getListings();
});

const port = process.env.PORT || config.get("port");
app.listen(port, function() {
  console.log(`Server started on port ${port}...`);
});

