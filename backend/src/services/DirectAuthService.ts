import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { query } from '../config/database';
import { Logger } from '../types';

// Import types
import { 
  User, 
  AuthResponse, 
  QueryResult 
} from '../types';

interface DatabaseUser extends User {
  password_hash: string;
}

class DirectAuthService {
    private jwtSecret: string;
    private jwtExpiration: string;
    private logger: Logger;

    constructor(logger?: Logger) {
        this.jwtSecret = process.env.JWT_SECRET || 'gep-scheduling-secret-key';
        this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
        this.logger = logger || require('../utils/logger');
    }

    /**
     * Authenticate user with email and password using direct database connection
     */
    async login(
        email: string, 
        password: string, 
        ipAddress: string, 
        userAgent: string
    ): Promise<AuthResponse> {
        try {
            this.logger.info(`Login attempt for: ${email}`);
            
            // Get user with password hash directly from database
            const result: QueryResult<DatabaseUser> = await query(`
                SELECT 
                    id, email, password_hash, first_name, last_name, role, 
                    partner_id, client_company_code, is_active, email_verified,
                    created_at, last_login_at
                FROM users 
                WHERE LOWER(email) = LOWER($1)
            `, [email]);

            if (result.rows.length === 0) {
                this.logger.warn(`Login failed - user not found: ${email}`);
                throw new Error('Invalid email or password');
            }

            const user = result.rows[0];
            this.logger.info(`User found: ${user.email}, active: ${user.is_active}`);

            // Check if user is active
            if (!user.is_active) {
                this.logger.warn(`Login failed - inactive user: ${email}`);
                throw new Error('Account is deactivated. Please contact administrator.');
            }

            // Verify password
            const passwordValid = this.verifyPassword(password, user.password_hash);
            if (!passwordValid) {
                this.logger.warn(`Login failed - invalid password for: ${email}`);
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
            this.logger.info(`User logged in successfully: ${user.email}`, {
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
            this.logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyToken(token: string): Promise<User> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as {
                userId: string;
                email: string;
                role: string;
            };
            
            // Get fresh user data
            const result: QueryResult<User> = await query(`
                SELECT 
                    id, email, first_name, last_name, role, 
                    partner_id, client_company_code, is_active,
                    created_at, last_login_at, email_verified
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
            this.logger.error('Token verification error:', (error as Error).message);
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Generate JWT token for user
     */
    private generateToken(user: User): string {
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
    hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * Verify password using crypto (same as AuthService)
     */
    private verifyPassword(password: string, storedHash: string): boolean {
        try {
            const [salt, hash] = storedHash.split(':');
            if (!salt || !hash) {
                this.logger.error('Invalid password hash format');
                return false;
            }
            
            const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
            return hash === verifyHash;
        } catch (error) {
            this.logger.error('Password verification error:', (error as Error).message);
            return false;
        }
    }

    /**
     * Remove sensitive data from user object
     */
    private sanitizeUser(user: DatabaseUser | User): User {
        const { password_hash, ...sanitizedUser } = user as DatabaseUser;
        return sanitizedUser;
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export default DirectAuthService;