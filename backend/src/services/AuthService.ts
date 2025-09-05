import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User, UserRole, Logger } from '../types';

const { supabaseAdmin } = require('../config/supabase');
const logger: Logger = require('../utils/logger');
import EmailService from './EmailService';

interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  partnerId?: string;
  clientCompanyCode?: string;
}

interface LoginResponse {
  user: Partial<User>;
  token: string;
  expiresIn: string;
}

interface RegistrationResponse {
  user: Partial<User>;
  message: string;
}

export class AuthService {
    private jwtSecret: string;
    private jwtExpiration: string;
    private bcryptRounds: number;

    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'gep-scheduling-secret-key';
        this.jwtExpiration = process.env.JWT_EXPIRATION || '24h';
        this.bcryptRounds = 12;
    }

    /**
     * Register a new user with role-based validation
     */
    async register(userData: UserRegistrationData): Promise<RegistrationResponse> {
        try {
            const { email, password, firstName, lastName, role, partnerId, clientCompanyCode } = userData;

            // Validate email format
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Check if user already exists
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Validate role-specific requirements
            await this.validateRoleRequirements(role, partnerId, clientCompanyCode);

            // Hash password using crypto
            const passwordHash = this.hashPassword(password);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');

            // Create user record
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .insert([{
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    first_name: firstName,
                    last_name: lastName,
                    role,
                    partner_id: partnerId || null,
                    client_company_code: clientCompanyCode || null,
                    email_verification_token: emailVerificationToken,
                    is_active: true
                }])
                .select('id, email, first_name, last_name, role, created_at')
                .single();

            if (error) {
                logger.error('User registration failed', error);
                throw new Error(`Registration failed: ${error.message}`);
            }

            // Send verification email
            await this.sendVerificationEmail(user.email, emailVerificationToken, user.first_name);

            logger.info('User registered successfully', {
                email: user.email,
                role: role
            });

            return {
                user: this.sanitizeUser(user),
                message: 'Registration successful. Please check your email for verification instructions.'
            };

        } catch (error) {
            logger.error('Registration error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Authenticate user and generate JWT token
     */
    async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
        try {
            // Get user with password hash
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select(`
                    id, email, password_hash, first_name, last_name, role, 
                    partner_id, client_company_code, is_active, email_verified,
                    partners(name, specialty, city),
                    clients(company_name)
                `)
                .eq('email', email.toLowerCase())
                .single();

            if (error || !user) {
                logger.warn('Login attempt with invalid email', { email });
                throw new Error('Invalid credentials');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Verify password
            if (!this.verifyPassword(password, user.password_hash)) {
                logger.warn('Login attempt with invalid password', { email });
                throw new Error('Invalid credentials');
            }

            // Update last login
            await supabaseAdmin
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', user.id);

            // Generate JWT token
            const token = this.generateToken(user);

            logger.info('User logged in successfully', {
                userId: user.id,
                email: user.email,
                role: user.role
            });

            return {
                user: this.sanitizeUser(user),
                token,
                expiresIn: this.jwtExpiration
            };

        } catch (error) {
            logger.error('Login error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Verify JWT token and return user data
     */
    async verifyToken(token: string): Promise<User> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;
            
            // Get fresh user data from database
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select(`
                    id, email, first_name, last_name, role, 
                    partner_id, client_company_code, is_active, 
                    email_verified, created_at, last_login_at
                `)
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                throw new Error('User not found');
            }

            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            return user;

        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    /**
     * Check if user has specific permission
     */
    async hasPermission(userId: string, permission: string, resourceType?: string | null, resourceId?: string): Promise<boolean> {
        try {
            // Get user with role
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (!user) {
                return false;
            }

            // Admin has all permissions
            if (user.role === 'admin') {
                return true;
            }

            // Implement role-based permission logic here
            // This is a simplified version - expand based on your needs
            const permissions: Record<UserRole, string[]> = {
                'admin': ['*'],
                'manager': ['read', 'write', 'delete'],
                'partner': ['read', 'write'],
                'client': ['read']
            };

            const userPermissions = permissions[user.role as UserRole] || [];
            return userPermissions.includes(permission) || userPermissions.includes('*');

        } catch (error) {
            logger.error('Permission check error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return false;
        }
    }

    /**
     * Generate JWT token for user
     */
    private generateToken(user: any): string {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            partnerId: user.partner_id,
            clientCompanyCode: user.client_company_code
        };

        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiration
        });
    }

    /**
     * Hash password using crypto
     */
    private hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    /**
     * Verify password against hash
     */
    private verifyPassword(password: string, hashedPassword: string): boolean {
        const [salt, originalHash] = hashedPassword.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return originalHash === hash;
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate role-specific requirements
     */
    private async validateRoleRequirements(role: UserRole, partnerId?: string, clientCompanyCode?: string): Promise<void> {
        switch (role) {
            case 'partner':
                if (!partnerId) {
                    throw new Error('Partner ID is required for partner role');
                }
                // Verify partner exists
                const { data: partner } = await supabaseAdmin
                    .from('partners')
                    .select('id')
                    .eq('id', partnerId)
                    .single();
                if (!partner) {
                    throw new Error('Invalid partner ID');
                }
                break;

            case 'client':
                if (!clientCompanyCode) {
                    throw new Error('Client company code is required for client role');
                }
                // Verify client exists
                const { data: client } = await supabaseAdmin
                    .from('clients')
                    .select('company_code')
                    .eq('company_code', clientCompanyCode)
                    .single();
                if (!client) {
                    throw new Error('Invalid client company code');
                }
                break;
        }
    }

    /**
     * Send verification email
     */
    private async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
        try {
            await EmailService.sendVerificationEmail(email, token, firstName);
        } catch (error) {
            logger.error('Failed to send verification email', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            // Don't throw - allow registration to continue
        }
    }

    /**
     * Refresh JWT token
     */
    async refreshToken(oldToken: string): Promise<{ token: string; expiresIn: string }> {
        try {
            const decoded = jwt.verify(oldToken, this.jwtSecret) as any;
            
            // Get fresh user data
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id, email, role, partner_id, client_company_code, is_active')
                .eq('id', decoded.userId)
                .single();

            if (error || !user || !user.is_active) {
                throw new Error('Invalid or inactive user');
            }

            const newToken = this.generateToken(user);
            
            return {
                token: newToken,
                expiresIn: this.jwtExpiration
            };
        } catch (error) {
            logger.error('Token refresh error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Change user password
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        try {
            // Get user with current password hash
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('password_hash')
                .eq('id', userId)
                .single();

            if (error || !user) {
                throw new Error('User not found');
            }

            // Verify old password
            if (!this.verifyPassword(oldPassword, user.password_hash)) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const newPasswordHash = this.hashPassword(newPassword);

            // Update password
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({ password_hash: newPasswordHash })
                .eq('id', userId);

            if (updateError) {
                throw new Error('Failed to update password');
            }

            logger.info('Password changed successfully', { userId });
        } catch (error) {
            logger.error('Change password error', { 
                error: error instanceof Error ? error.message : String(error),
                userId 
            });
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        try {
            // Check if user exists
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id, first_name, is_active')
                .eq('email', email.toLowerCase())
                .single();

            if (error || !user || !user.is_active) {
                // Don't reveal if user exists or not for security
                logger.info('Password reset requested for non-existent/inactive user', { email });
                return;
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpires = new Date(Date.now() + 1800000); // 30 minutes

            // Store reset token
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetTokenExpires.toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                throw new Error('Failed to store reset token');
            }

            // Send reset email
            await EmailService.sendPasswordResetEmail(email, resetToken, user.first_name);

            logger.info('Password reset email sent', { email });
        } catch (error) {
            logger.error('Password reset request error', { 
                error: error instanceof Error ? error.message : String(error),
                email 
            });
            throw error;
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        try {
            // Find user with valid reset token
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id, password_reset_token, password_reset_expires')
                .eq('password_reset_token', token)
                .single();

            if (error || !user) {
                throw new Error('Invalid reset token');
            }

            // Check if token is expired
            if (new Date() > new Date(user.password_reset_expires)) {
                throw new Error('Reset token has expired');
            }

            // Hash new password
            const passwordHash = this.hashPassword(newPassword);

            // Update password and clear reset token
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    password_hash: passwordHash,
                    password_reset_token: null,
                    password_reset_expires: null
                })
                .eq('id', user.id);

            if (updateError) {
                throw new Error('Failed to reset password');
            }

            logger.info('Password reset successfully', { userId: user.id });
        } catch (error) {
            logger.error('Password reset error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<void> {
        try {
            // Find user with verification token
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('id, email_verification_token')
                .eq('email_verification_token', token)
                .single();

            if (error || !user) {
                throw new Error('Invalid verification token');
            }

            // Update user as verified
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    email_verified: true,
                    email_verification_token: null
                })
                .eq('id', user.id);

            if (updateError) {
                throw new Error('Failed to verify email');
            }

            logger.info('Email verified successfully', { userId: user.id });
        } catch (error) {
            logger.error('Email verification error', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            throw error;
        }
    }

    /**
     * Remove sensitive data from user object
     */
    public sanitizeUser(user: any): Partial<User> {
        const { password_hash, email_verification_token, ...sanitized } = user;
        return sanitized;
    }
}

// Export singleton instance for backward compatibility
export default new AuthService();