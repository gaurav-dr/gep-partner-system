import { Logger, User } from '../types';
import { supabaseAdmin } from '../config/supabase';
import EmailService from './EmailService';
import WebSocketManager from './WebSocketManager';

const logger: Logger = require('../utils/logger');

interface NotificationTemplate {
  email?: {
    subject: string;
    template: string;
  };
  dashboard?: {
    title: string;
    message: string;
    icon: string;
    color: 'success' | 'warning' | 'danger' | 'info';
  };
}

interface NotificationData {
  [key: string]: any;
}

interface NotificationOptions {
  priority?: 'low' | 'normal' | 'high';
  channels?: ('email' | 'dashboard' | 'websocket')[];
  retryOnFailure?: boolean;
  scheduleFor?: Date;
}

interface QueuedNotification {
  id: string;
  type: string;
  recipients: string[];
  data: NotificationData;
  options: NotificationOptions;
  attempts: number;
  createdAt: Date;
  scheduledFor: Date;
}

interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  dashboardEnabled: boolean;
  websocketEnabled: boolean;
  categories: string[];
}

/**
 * Comprehensive Notification System
 * Handles email notifications, dashboard alerts, real-time updates
 * Supports role-based notifications, preferences, and delivery tracking
 */
class NotificationService {
    private emailService: typeof EmailService;
    private wsManager: WebSocketManager;
    private notificationQueue: QueuedNotification[];
    private batchSize: number;
    private batchInterval: number;
    private retryAttempts: number;
    private retryDelay: number;
    private templates: Record<string, NotificationTemplate>;
    private batchProcessor: NodeJS.Timeout | null;

    constructor() {
        this.emailService = EmailService;
        this.wsManager = new WebSocketManager();
        this.notificationQueue = [];
        this.batchSize = 10;
        this.batchInterval = 5000; // 5 seconds
        this.retryAttempts = 3;
        this.retryDelay = 30000; // 30 seconds
        this.batchProcessor = null;
        
        // Notification templates
        this.templates = {
            schedule_created: {
                email: {
                    subject: 'Νέο Πρόγραμμα Επισκέψεων - {installationName}',
                    template: 'schedule_created_email.html'
                },
                dashboard: {
                    title: 'Νέο Πρόγραμμα',
                    message: 'Δημιουργήθηκε νέο πρόγραμμα επισκέψεων για {installationName}',
                    icon: 'calendar-plus',
                    color: 'success'
                }
            },
            schedule_updated: {
                email: {
                    subject: 'Ενημέρωση Προγράμματος - {installationName}',
                    template: 'schedule_updated_email.html'
                },
                dashboard: {
                    title: 'Ενημέρωση Προγράμματος',
                    message: 'Ενημερώθηκε το πρόγραμμα επισκέψεων για {installationName}',
                    icon: 'calendar-edit',
                    color: 'info'
                }
            },
            partner_assigned: {
                email: {
                    subject: 'Νέα Ανάθεση - {clientName}',
                    template: 'partner_assigned_email.html'
                },
                dashboard: {
                    title: 'Νέα Ανάθεση',
                    message: 'Ανατέθηκε νέα εργασία από {clientName}',
                    icon: 'user-check',
                    color: 'success'
                }
            },
            assignment_accepted: {
                email: {
                    subject: 'Αποδοχή Ανάθεσης - {partnerName}',
                    template: 'assignment_accepted_email.html'
                },
                dashboard: {
                    title: 'Ανάθεση Αποδεκτή',
                    message: 'Ο {partnerName} αποδέχτηκε την ανάθεση',
                    icon: 'check-circle',
                    color: 'success'
                }
            },
            assignment_declined: {
                email: {
                    subject: 'Απόρριψη Ανάθεσης - {partnerName}',
                    template: 'assignment_declined_email.html'
                },
                dashboard: {
                    title: 'Ανάθεση Απορρίφθηκε',
                    message: 'Ο {partnerName} απέρριψε την ανάθεση',
                    icon: 'x-circle',
                    color: 'warning'
                }
            },
            system_alert: {
                email: {
                    subject: 'Ειδοποίηση Συστήματος - {alertType}',
                    template: 'system_alert_email.html'
                },
                dashboard: {
                    title: 'Ειδοποίηση Συστήματος',
                    message: '{alertMessage}',
                    icon: 'alert-triangle',
                    color: 'danger'
                }
            },
            contract_expiring: {
                email: {
                    subject: 'Λήξη Σύμβασης - {contractCode}',
                    template: 'contract_expiring_email.html'
                },
                dashboard: {
                    title: 'Λήξη Σύμβασης',
                    message: 'Η σύμβαση {contractCode} λήγει σε {daysUntilExpiry} ημέρες',
                    icon: 'calendar-x',
                    color: 'warning'
                }
            }
        };

        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Send notification to users
     */
    async sendNotification(
        type: string, 
        recipients: string[], 
        data: NotificationData, 
        options: NotificationOptions = {}
    ): Promise<string> {
        try {
            const notificationId = this.generateNotificationId();
            
            logger.info('Sending notification', { 
                type, 
                recipientCount: recipients.length,
                notificationId 
            });

            // Validate notification type
            if (!this.templates[type]) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            // Default options
            const defaultOptions: NotificationOptions = {
                priority: 'normal',
                channels: ['email', 'dashboard'],
                retryOnFailure: true,
                scheduleFor: new Date()
            };

            const finalOptions = { ...defaultOptions, ...options };

            // Queue notification for batch processing
            const queuedNotification: QueuedNotification = {
                id: notificationId,
                type,
                recipients,
                data,
                options: finalOptions,
                attempts: 0,
                createdAt: new Date(),
                scheduledFor: finalOptions.scheduleFor || new Date()
            };

            // Add to queue based on priority
            if (finalOptions.priority === 'high') {
                this.notificationQueue.unshift(queuedNotification);
            } else {
                this.notificationQueue.push(queuedNotification);
            }

            return notificationId;

        } catch (error) {
            logger.error('Failed to queue notification:', { 
                error: error instanceof Error ? error.message : String(error),
                type,
                recipientCount: recipients.length 
            });
            throw error;
        }
    }

    /**
     * Send immediate notification (bypasses queue)
     */
    async sendImmediateNotification(
        type: string, 
        recipients: string[], 
        data: NotificationData, 
        options: NotificationOptions = {}
    ): Promise<void> {
        try {
            const template = this.templates[type];
            if (!template) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            // Get user preferences
            const userPrefs = await this.getUserPreferences(recipients);

            // Send via requested channels
            const channels = options.channels || ['email', 'dashboard'];

            for (const channel of channels) {
                switch (channel) {
                    case 'email':
                        if (template.email) {
                            await this.sendEmailNotifications(recipients, template.email, data, userPrefs);
                        }
                        break;

                    case 'dashboard':
                        if (template.dashboard) {
                            await this.createDashboardNotifications(recipients, template.dashboard, data, userPrefs);
                        }
                        break;

                    case 'websocket':
                        await this.sendWebSocketNotifications(recipients, { type, data }, userPrefs);
                        break;
                }
            }

            // Log successful delivery
            await this.logNotificationDelivery(type, recipients, 'delivered');

        } catch (error) {
            logger.error('Failed to send immediate notification:', { 
                error: error instanceof Error ? error.message : String(error),
                type,
                recipientCount: recipients.length 
            });
            throw error;
        }
    }

    /**
     * Start batch processing of queued notifications
     */
    private startBatchProcessing(): void {
        this.batchProcessor = setInterval(async () => {
            if (this.notificationQueue.length === 0) {
                return;
            }

            const now = new Date();
            const batch = this.notificationQueue
                .filter(n => n.scheduledFor <= now)
                .slice(0, this.batchSize);

            if (batch.length === 0) {
                return;
            }

            // Remove processed notifications from queue
            this.notificationQueue = this.notificationQueue.filter(n => !batch.includes(n));

            // Process batch
            await this.processBatch(batch);

        }, this.batchInterval);

        logger.info('Notification batch processing started', { 
            batchSize: this.batchSize, 
            intervalMs: this.batchInterval 
        });
    }

    /**
     * Process batch of notifications
     */
    private async processBatch(batch: QueuedNotification[]): Promise<void> {
        logger.info('Processing notification batch', { batchSize: batch.length });

        for (const notification of batch) {
            try {
                await this.processNotification(notification);
            } catch (error) {
                logger.error('Failed to process notification:', { 
                    notificationId: notification.id,
                    error: error instanceof Error ? error.message : String(error) 
                });

                // Retry logic
                if (notification.options.retryOnFailure && notification.attempts < this.retryAttempts) {
                    notification.attempts++;
                    notification.scheduledFor = new Date(Date.now() + this.retryDelay);
                    this.notificationQueue.push(notification);
                }
            }
        }
    }

    /**
     * Process individual notification
     */
    private async processNotification(notification: QueuedNotification): Promise<void> {
        const { type, recipients, data, options } = notification;

        await this.sendImmediateNotification(type, recipients, data, options);
    }

    /**
     * Send email notifications
     */
    private async sendEmailNotifications(
        recipients: string[], 
        template: { subject: string; template: string }, 
        data: NotificationData,
        userPrefs: Record<string, NotificationPreferences>
    ): Promise<void> {
        const emailRecipients = recipients.filter(userId => {
            const prefs = userPrefs[userId];
            return prefs?.emailEnabled !== false;
        });

        if (emailRecipients.length === 0) {
            return;
        }

        // Get user email addresses
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, email, first_name, last_name')
            .in('id', emailRecipients);

        if (!users) return;

        // Send emails
        for (const user of users) {
            try {
                const personalizedData = { ...data, userName: `${user.first_name} ${user.last_name}` };
                const subject = this.interpolateTemplate(template.subject, personalizedData);

                await this.emailService.sendEmail({
                    to: user.email,
                    subject,
                    templateName: template.template,
                    templateData: personalizedData
                });

            } catch (error) {
                logger.error('Failed to send email notification:', { 
                    userId: user.id,
                    email: user.email,
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
    }

    /**
     * Create dashboard notifications
     */
    private async createDashboardNotifications(
        recipients: string[], 
        template: { title: string; message: string; icon: string; color: string }, 
        data: NotificationData,
        userPrefs: Record<string, NotificationPreferences>
    ): Promise<void> {
        const dashboardRecipients = recipients.filter(userId => {
            const prefs = userPrefs[userId];
            return prefs?.dashboardEnabled !== false;
        });

        if (dashboardRecipients.length === 0) {
            return;
        }

        const notifications = dashboardRecipients.map(userId => ({
            user_id: userId,
            title: this.interpolateTemplate(template.title, data),
            message: this.interpolateTemplate(template.message, data),
            icon: template.icon,
            color: template.color,
            is_read: false,
            created_at: new Date().toISOString()
        }));

        const { error } = await supabaseAdmin
            .from('notifications')
            .insert(notifications);

        if (error) {
            throw new Error(`Failed to create dashboard notifications: ${error.message}`);
        }
    }

    /**
     * Send WebSocket notifications
     */
    private async sendWebSocketNotifications(
        recipients: string[], 
        payload: { type: string; data: NotificationData },
        userPrefs: Record<string, NotificationPreferences>
    ): Promise<void> {
        const wsRecipients = recipients.filter(userId => {
            const prefs = userPrefs[userId];
            return prefs?.websocketEnabled !== false;
        });

        for (const userId of wsRecipients) {
            try {
                await this.wsManager.sendToUser(userId, {
                    type: 'notification',
                    payload,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.warn('Failed to send WebSocket notification:', { 
                    userId,
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }
    }

    /**
     * Get user notification preferences
     */
    private async getUserPreferences(userIds: string[]): Promise<Record<string, NotificationPreferences>> {
        const { data: preferences } = await supabaseAdmin
            .from('user_notification_preferences')
            .select('*')
            .in('user_id', userIds);

        const prefMap: Record<string, NotificationPreferences> = {};

        // Set defaults for users without preferences
        userIds.forEach(userId => {
            prefMap[userId] = {
                userId,
                emailEnabled: true,
                dashboardEnabled: true,
                websocketEnabled: true,
                categories: []
            };
        });

        // Override with actual preferences
        preferences?.forEach(pref => {
            prefMap[pref.user_id] = {
                userId: pref.user_id,
                emailEnabled: pref.email_enabled,
                dashboardEnabled: pref.dashboard_enabled,
                websocketEnabled: pref.websocket_enabled,
                categories: pref.categories || []
            };
        });

        return prefMap;
    }

    /**
     * Log notification delivery
     */
    private async logNotificationDelivery(
        type: string, 
        recipients: string[], 
        status: 'delivered' | 'failed'
    ): Promise<void> {
        try {
            const logEntries = recipients.map(userId => ({
                notification_type: type,
                recipient_id: userId,
                delivery_status: status,
                delivered_at: new Date().toISOString()
            }));

            await supabaseAdmin
                .from('notification_delivery_log')
                .insert(logEntries);

        } catch (error) {
            logger.warn('Failed to log notification delivery:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    }

    /**
     * Interpolate template strings with data
     */
    private interpolateTemplate(template: string, data: NotificationData): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    }

    /**
     * Generate unique notification ID
     */
    private generateNotificationId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get notification statistics
     */
    async getNotificationStats(): Promise<any> {
        try {
            const { data: stats } = await supabaseAdmin
                .rpc('get_notification_stats');

            return {
                queueSize: this.notificationQueue.length,
                ...stats
            };

        } catch (error) {
            logger.error('Failed to get notification stats:', { 
                error: error instanceof Error ? error.message : String(error) 
            });
            return { queueSize: this.notificationQueue.length };
        }
    }

    /**
     * Cleanup and stop processing
     */
    cleanup(): void {
        if (this.batchProcessor) {
            clearInterval(this.batchProcessor);
            this.batchProcessor = null;
        }
        
        this.notificationQueue = [];
        logger.info('NotificationService cleanup completed');
    }
}

export default NotificationService;