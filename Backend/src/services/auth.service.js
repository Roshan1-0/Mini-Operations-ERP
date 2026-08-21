import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../config/db.config.js'
import { users } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

/**
 * Registers a new user.
 * Hashes the password before storing — plain passwords are never saved.
 */
export async function registerUser({ name, email, password, role }) {
    // Check if email is already registered
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existing.length > 0) {
        throw new AppError('An account with this email already exists.', 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const [newUser] = await db.insert(users).values({
        name,
        email,
        passwordHash,
        role
    }).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
    })

    return newUser
}

/**
 * Verifies credentials and returns a signed JWT token.
 * Never reveals whether the email or password specifically was wrong.
 */
export async function loginUser({ email, password }) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
        throw new AppError('Invalid email or password.', 401)
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
        throw new AppError('Invalid email or password.', 401)
    }

    // JWT payload contains only id and role — never the password hash
    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    )

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    }
}

/**
 * Returns the current authenticated user's profile by ID.
 */
export async function getCurrentUser(userId) {
    const [user] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
    }).from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
        throw new AppError('User not found.', 404)
    }

    return user
}
