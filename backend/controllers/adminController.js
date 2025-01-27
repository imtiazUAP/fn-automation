//? ===================================================== Admin Controller =====================================================

// ===================== Importing necessary modules/files =====================
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateAuthToken from "../utils/jwtHelpers/generateAuthToken.js";
import destroyAuthToken from "../utils/jwtHelpers/destroyAuthToken.js";
import CronService from '../services/cronService.js';
import {
  fetchAllUsers,
  updateUser,
  blockUserHelper,
  unBlockUserHelper,
  activateUserHelper,
  fetchAllActiveProviders,
} from "../utils/adminHelpers.js";
import { sendUserActivatedEmail, sendUserBlockedEmail, sendUserUnblockedEmail, sendUserSignedUpEmail } from '../utils/emailHelpers/SendMail.js';
import { BadRequestError, UnauthorizedError, NotFoundError, InternalServerError } from '@emtiaj/custom-errors';
import UserService from '../services/userService.js';


/*
   # Desc: admin authentication
   # Route: POST /api/v1/admin/auth
   # Access: PUBLIC
  */
const authAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // If email or password is empty, return error
    throw new BadRequestError("Email and password must be provided.");
  }
  // Find the user in Db with the email and password
  const admin = await User.findOne({ email: email });
  let passwordValid = false;
  if (admin) {
    passwordValid = await admin.matchPassword(password);
  }
  if (passwordValid) {
    // If user is created, send response back with jwt token
    generateAuthToken(res, admin._id, admin.email); // Middleware to Generate token and send it back in response object
    const verifiedAdminData = {
      name: admin.name,
      email: admin.email,
      isAdmin: admin.isAdmin,
      isActive: admin.isActive,
    };
    res.status(200).json(verifiedAdminData);
  }
  if (!admin || !passwordValid) {
    // If user or user password is not valid, send error back
    throw new BadRequestError("Invalid Email or Password - Admin authentication failed.");
  }
});


/*
   # Desc: Register new user
   # Route: POST /api/v1/admin/
   # Access: PUBLIC
  */
const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, adminRegistrationKey } = req.body;
  if (!email || !password) {
    // If email or password is empty, return error
    throw new BadRequestError("Email or Password is missing in the request - Admin registration failed.");
  }
  if (!adminRegistrationKey) {
    // If adminRegistrationKey is empty, return error
    throw new BadRequestError("No Admin Registration Access Code - Admin registration aborted.");
  } else {
    // Check if Admin registration key is valid
    if (process.env.ADMIN_REGISTRATION_KEY !== adminRegistrationKey) {
      throw new UnauthorizedError("Incorrect admin registration key.");
    }
  }
  // Check if user already exist
  const userExists = await User.findOne({ email });
  // If the user already exists, throw an error
  if (userExists) {
    throw new BadRequestError("Admin already exists.");
  }

  const userService = new UserService();
  const adminExist = await userService.isActiveAdminExist();

  // Store the user data to DB if the user dosen't exist already.
  const user = await User.create({
    name: name,
    email: email,
    password: password,
    isAdmin: true,
    isActive: adminExist ? false : true,
  });
  if (user) {
    // If user is created, send response back with jwt token
    generateAuthToken(res, user._id, user.email); // Middleware to Generate token and send it back in response object
    const registeredUserData = {
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    };

    if (!user.isActive) {
      // Send mail to admin, if admin account is not activated
      await sendUserSignedUpEmail(user.userId, user.name, user.email, user.isAdmin);
    }

    res.status(201).json(registeredUserData);
  } else {
    // If user was NOT Created, send error back
    throw new BadRequestError("Invalid data - Admin registration failed.");
  }
});


/*
   # Desc: Logout user / clear cookie
   # Route: POST /api/v1/admin/logout
   # Access: PUBLIC
  */
const logoutAdmin = asyncHandler(async (req, res) => {
  destroyAuthToken(res);
  res.status(200).json({ message: "Admin Logged Out" });
});


/*
   # Desc: Get user profile
   # Route: GET /api/v1/admin/profile
   # Access: PRIVATE
  */
const getAdminProfile = asyncHandler(async (req, res) => {
  const user = {
    name: req.user.name,
    email: req.user.email,
  };
  res.status(200).json({ user });
});


/*
   # Desc: Update Admin profile
   # Route: PUT /api/v1/admin/profile
   # Access: PRIVATE
  */
const updateAdminProfile = asyncHandler(async (req, res) => {
  // Find the user data with user id in the request object
  const admin = await User.findById(req.user._id);
  if (admin) {
    // Update the admin-user with new data if found or keep the old data itself.
    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;
    // If request has new password, update the user with the new password
    if (req.body.password) {
      admin.password = req.body.password;
    }
    if (req.file) {
      admin.profileImageName = req.file.filename || admin.profileImageName;
    }
    const updatedAdminData = await admin.save();
    // Send the response with updated user data
    res.status(200).json({
      name: updatedAdminData.name,
      email: updatedAdminData.email,
      profileImageName: updatedAdminData.profileImageName,
      isActive: updatedAdminData.isActive,
      isAdmin: updatedAdminData.isAdmin,
    });
  } else {
    // If requested admin was not found in db, return error
    throw new NotFoundError("Admin account not found.");
  }
});


/*
   # Desc: Get all users
   # Route: POST /api/v1/admin/get-users/page/:page
   # Access: PRIVATE
  */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page } = req.params;

  // Define the query options
  const limit = 10;
  const start = page > 1 ? (page - 1) * limit : 0;
  const sort = { timestamp: -1 };

  const totalUsers = await User.countDocuments({
    $or: [
      { deleted: { $exists: false } },
      { deleted: false }
    ]
  });

  const usersData = await fetchAllUsers(start, limit, sort);
  if (usersData) {
    res.status(200).json({ usersData, totalUsers });
  } else {
    throw new NotFoundError("Users not found.");
  }
});


/*
   # Desc: Get all active users
   # Route: GET /api/v1/admin/get-providers
   # Access: PRIVATE
  */
const getAllActiveProviders = asyncHandler(async (req, res) => {
  const providers = await fetchAllActiveProviders();
  if (providers) {
    res.status(200).json({ providers });
  } else {
    throw new NotFoundError("Not found active providers.");
  }
});


/*
   # Desc: Activate a user
   # Route: PATCH /api/v1/admin/activate-user
   # Access: PRIVATE
  */
const activateUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User activation failed.");
  }
  const activateUser = await activateUserHelper(userId);
  if (activateUser) {
    // Send mail to user
    sendUserActivatedEmail(activateUser.name, activateUser.email);

    res.status(201).json({ message: "User activated successfully." });
  } else {
    throw new InternalServerError('User activation failed.');
  }
});


/*
   # Desc: Block a user
   # Route: PATCH /api/v1/admin/block-user
   # Access: PRIVATE
  */
const blockUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User blocking failed.");
  }
  const userBlocked = await blockUserHelper(userId);
  if (userBlocked) {
    // Send mail to user
    sendUserBlockedEmail(userBlocked.name, userBlocked.email);

    res.status(201).json({ message: "User blocked successfully." });
  } else {
    throw new InternalServerError("Failed to block user.");
  }
});


/*
   # Desc: Unblock a user
   # Route: PATCH /api/v1/admin/unblock-user
   # Access: PRIVATE
  */
const unBlockUser = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  if (!userId) {
    throw new BadRequestError("UserId not received in request - User Un-blocking failed.");
  }
  const userUnblocked = await unBlockUserHelper(userId);
  if (userUnblocked) {
    // Send mail to user
    sendUserUnblockedEmail(userUnblocked.name, userUnblocked.email);

    res.status(201).json({ message: "User un-blocked successfully." });
  } else {
    throw new InternalServerError("Failed to un-block user.");
  }
});


/*
   # Desc: Update a user
   # Route: PUT /api/v1/admin/update-user
   # Access: PRIVATE
  */
const updateUserData = asyncHandler(async (req, res) => {
  const userId = req.body.userId;
  const name = req.body.name;
  const email = req.body.email;
  if (!userId || !name || !email) {
    throw new BadRequestError("User data not received in request - User update failed.");
  }
  const userData = { userId: userId, name: name, email: email };
  const usersUpdateStatus = await updateUser(userData);
  if (usersUpdateStatus.success) {
    const response = usersUpdateStatus.message;
    res.status(200).json({ message: response });
  } else {
    throw new InternalServerError("User update failed.");
  }
});

// PUT endpoint to update isFnServiceCompanyAdmin for a specific userId
const updateFnServiceCompanyAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Step 1: Set isFnServiceCompanyAdmin = false for all existing admins
  await User.updateMany({ isFnServiceCompanyAdmin: true }, { $set: { isFnServiceCompanyAdmin: false } });

  // Step 2: Find and update the specific user by userId to set isFnServiceCompanyAdmin = true
  const user = await User.findOneAndUpdate(
    { userId: userId }, // Find the user by userId
    { $set: { isFnServiceCompanyAdmin: true } }, // Update isFnServiceCompanyAdmin to true
    { new: true } // Return the updated user
  );

  // Step 3: Check if the user exists
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  res.status(200).json({
    message: `User: ${user.name} is now the service company admin`,
    user,
  });
});


/*
   # Desc: Delete a user
   # Route: DELETE /api/v1/admin/delete-user/:userId
   # Access: PRIVATE
  */
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new BadRequestError("UserId not received in request");
  }

  const user = await User.findById(userId);

  // If cron exist for the user, delete tem as well
  const cronService = new CronService(user.userId);
  const crons = await cronService.fetchAllCrons();
  if (crons && crons.length) {
    crons.map(async (cron) => {
      await cronService.deleteCron(cron.cronId);
    });
  }

  // Find and delete the cron by ID
  const deleteUser = await User.findByIdAndDelete(userId);
  if (deleteUser) {
    res.status(204).json({ message: "User deleted successfully." });
  } else {
    throw new InternalServerError("Failed to delete user.");
  }
});

export {
  authAdmin,
  registerAdmin,
  logoutAdmin,
  getAdminProfile,
  updateAdminProfile,
  getAllUsers,
  blockUser,
  unBlockUser,
  updateUserData,
  activateUser,
  updateFnServiceCompanyAdmin,
  deleteUser,
  getAllActiveProviders,
};
