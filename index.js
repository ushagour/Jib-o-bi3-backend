const express = require("express");
const categories = require("./routes/categories");
const listings = require("./routes/listings");
const user = require("./routes/user");
const stats = require("./routes/stats");
const users = require("./routes/users");
const auth = require("./routes/auth");
const reviews = require("./routes/reviews");
const orders = require("./routes/orders");
const notifications = require("./routes/notifications");
const messages = require("./routes/messages");
const favorites = require("./routes/favorites");
const expoPushTokens = require("./routes/expoPushTokens");
const adminNotifications = require("./routes/adminNotifications");
const settings = require("./routes/settings");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
const app = express();
const { sequelize, Notification, Message } = require('./models');

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
app.use("/api/notifications", notifications);
app.use("/api/messages", messages);
app.use("/api/favorites", favorites);
app.use("/api/users", users);
app.use("/api/auth", auth);
app.use("/api/expoPushTokens", expoPushTokens);
app.use("/api/reviews", reviews);
app.use("/api/stats", stats);
app.use("/api/admin-notifications", adminNotifications);
app.use("/api/settings", settings);



async function migrateLegacyMessages() {
        const messageCount = await Message.count();
        if (messageCount > 0) {
                return;
        }

        const legacyMessages = await Notification.findAll({
                where: { type: 'message' },
                order: [['createdAt', 'ASC']],
        });

        if (legacyMessages.length === 0) {
                return;
        }

        const rows = legacyMessages
            .filter((item) => item.actor_id && item.user_id)
            .map((item) => ({
                sender_id: item.actor_id,
                recipient_id: item.user_id,
                listing_id: item.listing_id || null,
                content: item.content,
                is_read: Boolean(item.is_read),
                read_at: item.read_at || null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            }));

        if (rows.length > 0) {
            await Message.bulkCreate(rows, { validate: true });
            console.log(`Migrated ${rows.length} legacy message notifications into the messages table.`);
        }
    }

async function ensureUserPasswordResetColumns() {
        const queryInterface = sequelize.getQueryInterface();
        const userColumns = await queryInterface.describeTable('Users');

        if (!userColumns.resetPasswordToken) {
                await queryInterface.addColumn('Users', 'resetPasswordToken', {
                        type: require('sequelize').DataTypes.STRING,
                        allowNull: true,
                });
        }

        if (!userColumns.resetPasswordExpires) {
                await queryInterface.addColumn('Users', 'resetPasswordExpires', {
                        type: require('sequelize').DataTypes.DATE,
                        allowNull: true,
                });
        }
}

// Sync database and start server
sequelize.sync().then(async () => {
        await ensureUserPasswordResetColumns();
        await migrateLegacyMessages();
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
        });
});



