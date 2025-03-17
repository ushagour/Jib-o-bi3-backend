const express = require("express");
const categories = require("./routes/categories");
const listings = require("./routes/listings");
const users = require("./routes/users");
const user = require("./routes/user");
const auth = require("./routes/auth");
const my_Notifications = require("./routes/my_Notifications");
const expoPushTokens = require("./routes/expoPushTokens");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
const app = express();
const { User, Category, Listing, Image, sequelize } = require('./models');

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
app.use("/api/my_Notifications", my_Notifications);


// Sync database and start server
sequelize.sync().then(() => {
    const PORT = process.env.PORT || config.get("port");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});




// Example: Create a new user
// async function createUser() {
//     const user = await User.create({
//         name: 'john_doe',
//         email: 'john@example.com',
//         password:  bcrypt.hashSync('password123', 10), 
//     });
//     console.log(user);
// }


// async function createListing() {
//     const listing = await Listing.create({
//         title: 'Example Listing',
//         price: 100,
//         description: 'This is an example listing.',
//         status: 'active',  
//         user_id: 1,
//         category_id: 1,
//         images: [
//             {
//                 "id": 1,
//                 "fileName": "couch2",
//                 "listing_id": 1
//             }
//         ],
//         latitude: 37.7749,
//         longitude: -122.4194,

//     });
//     console.log(listing);
// }   

// // Example: Fetch all listings with their images
// async function getListings() {
//     const listings = await Listing.findAll({
//         include: [{ model: Image, as: 'images' }], // Use the same alias 'images'
//     });
//     console.log(listings);
// }

// // Sync models with the database
// sequelize.sync().then(() => {
//     console.log('Database synced!');
//     //     createListing();
//     // getListings();
// });


