const users = [
  {
    id: 1,
    name: "User1",
    email: "user1@domain.com",
    avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    password: "12345",
  },
  {
    id: 2,
    name: "User2",
    email: "user2@domain.com",
    avatar: "https://randomuser.me/api/portraits/lego/2.jpg",
    password: "12345",
  },
];

const getUsers = () => users;

const getUserById = (id) => users.find((user) => user.id === id);

const getUserByEmail = (email) => users.find((user) => user.email === email);

// Function to add a user
const addUser = (user) => {
  // Validate the incoming user object
  if (!user.name || !user.email || !user.password) {
    console.log("Invalid user data. Name, email, and password are required.");
    return;
  }

  // Check if a user with the same email already exists
  const existingUser = users.find(u => u.email === user.email);
  if (existingUser) {
    console.log("User with this email already exists:", user.email);
    return;
  }

  // Generate an ID based on the length of the array
  const newId = users.length > 0 ? users[users.length - 1].id + 1 : 1;

  const newUser = {
    id: newId, // ID is the first attribute
    name: user.name,
    email: user.email,
    password: user.password
  };


  // Add the new user to the array
  users.push(newUser);

  // Log the new user for verification

};


const updateUser = (id, updatedUser) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updatedUser };
  }
  console.log("User updated:", users[index]);
  
};





module.exports = {
  getUsers,
  getUserByEmail,
  getUserById,
  addUser,
  updateUser,
};
