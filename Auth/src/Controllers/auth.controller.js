const userModel = require("../Models/user.model");
const sellerModel = require("../Models/seller.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const redis = require("../DB/redis");
const { publishToQueue } = require("../Broker/broker");

//REGISTER USER
async function registeruser(req, res) {
  const { username, email, password, fullName, role, address } = req.body;

  const isUserAlreadyExist = await userModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isUserAlreadyExist) {
    return res.status(409).json({
      message: "User already exists with this email or username",
    });
  }

  const HashedPassword = await bcrypt.hash(password, 10);
  const userData = {
    username,
    email,
    password: HashedPassword,
    fullName: {
      firstName: fullName.firstName,
      lastName: fullName.lastName,
    },
    addresses: [
      {
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
        default: true,
      },
    ],
  };

  if (role) {
    userData.role = role;
  }

  const user = await userModel.create(userData);



  // publish notifications in parallel
  await Promise.all([
    publishToQueue("AUTH_NOTIFICATION.USER_CREATED", {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    }),

    publishToQueue("AUTH_SELLER_DASHBOARD.USER_CREATED", user),
  ]);

  

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 3600000, // 1 hour
  });

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      addresses: user.addresses || [],
      role: user.role,
    },
  });
}

//REGISTER SELLER

async function registerSeller
(req, res) {
  const { username, email, password, fullName, role } = req.body;

  const isSellerAlreadyExist = await sellerModel.findOne({
    $or: [{ username }, { email }],
  });

  if (isSellerAlreadyExist) {
    return res.status(409).json({
      message: "Seller   already exists with this email or username",
    });
  }

  const HashedPassword = await bcrypt.hash(password, 10);
  const sellerData = {
    username,
    email,
    password: HashedPassword,
    fullName: {
      firstName: fullName.firstName,
      lastName: fullName.lastName,
    }
  };

  if (role) {
    sellerData.role = role;
  }

  const seller = await sellerModel.create(sellerData);



  // publish notifications in parallel
  await Promise.all([
    publishToQueue("AUTH_NOTIFICATION.SELLER_CREATED", {
      id: seller._id,
      username: seller.username,
      email: seller.email,
      fullName: seller.fullName,
      role: seller.role,
    }),

    publishToQueue("AUTH_SELLER_DASHBOARD.SELLER_CREATED", seller),
  ]);

  

  const token = jwt.sign(
    {
      id: seller._id,
      username: seller.username,
      email: seller.email,
      role: seller.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 3600000, // 1 hour
  });

  return res.status(201).json({
    success: true,
    message: "Seller registered successfully",
    seller: {
      username: seller.username,
      email: seller.email,
      fullName: seller.fullName,
      role: seller.role,
    }
  });
}



//LOGIN USER
async function loginuser(req, res) {
  try {
    let { username, email, password } = req.body;

    // Validate required fields

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,

        message: "Email or username and password are required",
      });
    }

    // Normalize email

    if (email) {
      email = email.toLowerCase();
    }

    // Build query dynamically

    let orConditions = [];

    if (email) {
      orConditions.push({ email });
    }

    if (username) {
      orConditions.push({ username });
    }

    // Find user

    const user = await userModel
      .findOne({
        $or: orConditions,
      })
      .select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Compare password

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Generate token

    const token = jwt.sign(
      {
        id: user._id,

        username: user.username,

        email: user.email,

        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Set cookie

    res.cookie("token", token, {
      httpOnly: true,

      secure: true,

      sameSite: "strict",

      maxAge: 3600000,
    });

    return res.status(200).json({
      success: true,

      message: "Login successful",

      user: {
        id: user._id,

        username: user.username,

        email: user.email,

        fullName: user.fullName,

        addresses: user.addresses || [],

        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: "Internal server error",
    });
  }
}

//LOGIN SELLER

async function loginSeller(req, res) {
  try {
    let { username, email, password } = req.body;

    // Validate required fields

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,

        message: "Email or username and password are required",
      });
    }

    // Normalize email

    if (email) {
      email = email.toLowerCase();
    }

    // Build query dynamically

    let orConditions = [];

    if (email) {
      orConditions.push({ email });
    }

    if (username) {
      orConditions.push({ username });
    }

    // Find seller

    const seller = await sellerModel
      .findOne({
        $or: orConditions,
      })
      .select("+password");

    if (!seller) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Compare password

    const isPasswordMatch = await bcrypt.compare(password, seller.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,

        message: "Invalid username, email or password",
      });
    }

    // Generate token

    const token = jwt.sign(
      {
        id: seller._id,

        username: seller.username,

        email: seller.email,

        role: seller.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Set cookie

    res.cookie("token", token, {
      httpOnly: true,

      secure: true,

      sameSite: "strict",

      maxAge: 3600000,
    });

    return res.status(200).json({
      success: true,

      message: "Login successful",

      user: {
        id: seller._id,

        username: seller.username,

        email: seller.email,

        fullName: seller.fullName,

       

        role: seller.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message: "Internal server error",
    });
  }
}

// GET CURRENT USER
async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id;

    // Fetch full user from database
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        addresses: user.addresses || [],
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
}

// LOGOUT USER
async function   logoutUser(req, res) {
  try {
    const token = req.cookies.token;

    if (token) {
      try {
        // Add token to Redis blacklist
        await redis.set(`blacklist_${token}`, "true", "EX", 3600); // Set expiry to match token expiry
      } catch (redisError) {
        // Log redis error but don't fail the logout
        console.warn("Redis error during logout:", redisError.message);
      }
    }

    // Clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging out",
    });
  }
}

// GET USER ADDRESSES
async function getUserAddresses(req, res) {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      addresses: user.addresses || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching addresses",
    });
  }
}

// ADD ADDRESS
async function addAddress(req, res) {
  try {
    const { addressLine, city, state, pincode, phone } = req.body;

    // Validate required fields
    if (!addressLine || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits",
      });
    }

    // Validate phone format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    const userId = req.user.id;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create new address
    const newAddress = {
      addressLine,
      city,
      state,
      pincode,
      phone,
      default: user.addresses.length === 0, // First address is default
    };

    user.addresses.push(newAddress);
    await user.save();

    // Get the added address
    const addedAddress = user.addresses[user.addresses.length - 1];

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: addedAddress,
      addresses: user.addresses || [],
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding address",
    });
  }
}

// DELETE ADDRESS
async function deleteAddress(req, res) {
  try {
    const { addressId } = req.params;
    const userId = req.user.id;

    // Validate address ID format
    if (!addressId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID format",
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find the address to delete
    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Remove the address
    const wasDefault = user.addresses[addressIndex].default;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are remaining addresses, set first as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].default = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting address",
    });
  }
}

module.exports = {
  registeruser,
  loginuser,
  logoutUser,
  getCurrentUser,
  getUserAddresses,
  addAddress,
  deleteAddress,
  registerSeller,
  loginSeller
};
