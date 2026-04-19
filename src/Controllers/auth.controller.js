const userModel = require('../Models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redis = require('../DB/redis');

//REGISTER USER
async function registeruser(req, res) {
    const { username, email, password, fullName } = req.body;

    const isUserAlreadyExist = await userModel.findOne({
        $or: [
            { username }, { email }
        ]
    })

    if (isUserAlreadyExist) {
        return res.status(409).json({ 
            success: false,
            message: 'User already exists with this email or username' 
        });
    }

    const HashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({
        username,
        email,
        password: HashedPassword,
        fullName:{
            firstName:fullName.firstName,
            lastName:fullName.lastName
        }
    });

    const token = jwt.sign({ 
        id: user._id,
        username: user.username,
        email: user.email,
        role:user.role
     }, process.env.JWT_SECRET, { expiresIn: '1h' });   

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
    });

    return res.status(201).json(
        { 
            success: true,
            message: 'User registered successfully',
            user: {
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });

}


//LOGIN USER
async function loginuser(req, res) {
    const { username, email, password } = req.body;

    // Validate required fields
    if ((!email && !username) || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    // Find user
    const user = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    }).select('+password');

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid username, email or password'
        });
    }

    // Compare password
    const isPasswordMatch =
        await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid username, email or password'
        });
    }

    // Generate token
    const token = jwt.sign({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000
    });

    return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
        }
    });
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
                message: 'User not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Current user fetched successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
}

module.exports = {
    registeruser,
    loginuser,
    getCurrentUser
}
