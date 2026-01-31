import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';  // Import the User model
import { checkAuth } from '../middleware/auth';
import {deleteUser, getUsers, makeUserAdmin, removeUserAdmin} from "../controllers/UserController";  // Middleware to protect routes

const router = express.Router();

// User signup route
router.post('/signup', async (req, res) => {
    // Destructure username, email, and password from req.body
    const { username, email, password } = req.body;

    try {
        // Ensure all required fields are present
        if (!username || !email || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        // Check if the user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate JWT token
        const payload = {
            userId: user._id,
            isAdmin: user.isAdmin
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
            expiresIn: '1h',
        });

        res.status(201).json({ token, isAdmin: user.isAdmin });
    } catch (error: any) {
        console.error(error?.message || error); // Log error for debugging
        res.status(500).send('Server error');
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Compare the password provided with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // If the passwords match, generate and return a token
        const payload = {
            userId: user._id,
            isAdmin: user.isAdmin
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
            expiresIn: '1h',
        });

        res.status(200).json({ token, isAdmin: user.isAdmin });
    } catch (error: any) {
        console.error(error?.message || error);
        res.status(500).send('Server error');
    }
});

// Note: Administrative actions (promote/demote) are intentionally not exposed via HTTP
// to ensure admin status can only be changed manually in the backend/database.
// If you need a protected admin API in future, implement server-side-only endpoints
// that require strong authentication and authorization.

// Route to delete a user (kept for backend maintenance; ideally protected)
router.delete('/user/:userId', deleteUser);

// Route to get all users
router.get('/users', getUsers);  // Fetch all users

export default router;
