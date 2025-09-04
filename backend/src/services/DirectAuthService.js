const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../utils/logger');

class DirectAuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'gep-scheduling-secret-key';
        this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    }

    /**
     * Authenticate user with email and password using direct database connection
     */
    async login(email, password, ipAddress, userAgent) {
        try {
            logger.info(`Login attempt for: ${email}`);
            
            // Get user with password hash directly from database
            const result = await query(`
                SELECT 
                    id, email, password_hash, first_name, last_name, role, 
                    partner_id, client_company_code, is_active, email_verified
                FROM users 
                WHERE LOWER(email) = LOWER($1)
            `, [email]);

            if (result.rows.length === 0) {
                logger.warn(`Login failed - user not found: ${email}`);
                throw new Error('Invalid email or password');
            }

            const user = result.rows[0];
            logger.info(`User found: ${user.email}, active: ${user.is_active}`);

            // Check if user is active
            if (!user.is_active) {
                logger.warn(`Login failed - inactive user: ${email}`);
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            // Verify password
            const passwordValid = this.verifyPassword(password, user.password_hash);
            if (!passwordValid) {
                logger.warn(`Login failed - invalid password for: ${email}`);
                throw new Error('Invalid email or password');
            }

            // Check email verification for production
            if (process.env.NODE_ENV === 'production' && !user.email_verified) {
                throw new Error('Please verify your email before logging in');
            }

            // Update last login timestamp
            await query(`
                UPDATE users 
                SET last_login_at = NOW() 
                WHERE id = $1
            `, [user.id]);

            // Generate JWT token
            const token = this.generateToken(user);

            // Log successful login
            logger.info(`User logged in successfully: ${user.email}`, {
                userId: user.id,
                role: user.role,
                ipAddress,
                userAgent
            });

            return {
                token,
                user: this.sanitizeUser(user),
                expiresIn: this.jwtExpiration
            };

        } catch (error) {
            logger.error('Login error:', error.message);
            throw error;
        }
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Get fresh user data
            const result = await query(`
                SELECT 
                    id, email, first_name, last_name, role, 
                    partner_id, client_company_code, is_active
                FROM users 
                WHERE id = $1
            `, [decoded.userId]);

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = result.rows[0];
            
            if (!user.is_active) {
                throw new Error('User account is deactivated');
            }

            return this.sanitizeUser(user);

        } catch (error) {
            logger.error('Token verification error:', error.message);
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Generate JWT token for user
     */
    generateToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            partnerId: user.partner_id
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiration
        });
    }

    /**
     * Hash password using crypto (same as AuthService)
     */
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * Verify password using crypto (same as AuthService)
     */
    verifyPassword(password, storedHash) {
        try {
            const [salt, hash] = storedHash.split(':');
            const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
            return hash === verifyHash;
        } catch (error) {
            logger.error('Password verification error:', error.message);
            return false;
        }
    }

    /**
     * Remove sensitive data from user object
     */
    sanitizeUser(user) {
        const { password_hash, ...sanitizedUser } = user;
        return sanitizedUser;
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = DirectAuthService;