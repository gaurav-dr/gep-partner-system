import { Logger } from '../../types';
import { supabaseAdmin } from '../../config/supabase';

const logger: Logger = require('../../utils/logger');

export interface NotificationTemplate {
  type: string;
  title: string;
  body: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  in_app: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface NotificationData {
  template: NotificationTemplate;
  recipients: NotificationRecipient[];
  data?: Record<string, any>;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export default class NotificationService {
    private templates: Map<string, NotificationTemplate>;

    constructor() {
        this.templates = new Map();
        this.initializeDefaultTemplates();
    }

    async sendNotification(notificationData: NotificationData): Promise<void> {
        try {
            logger.info('Sending notification', {
                type: notificationData.template.type,
                recipients: notificationData.recipients.length
            });

            for (const recipient of notificationData.recipients) {
                await this.processRecipient(notificationData, recipient);
            }

            logger.info('Notification sent successfully');

        } catch (error) {
            logger.error('Failed to send notification:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
        try {
            logger.info('Sending bulk notifications', { count: notifications.length });

            const promises = notifications.map(notification => 
                this.sendNotification(notification).catch(error => {
                    logger.error('Bulk notification failed:', { error });
                    return null;
                })
            );

            await Promise.all(promises);
            logger.info('Bulk notifications completed');

        } catch (error) {
            logger.error('Bulk notification process failed:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async scheduleNotification(notificationData: NotificationData): Promise<string> {
        try {
            const notificationRecord = {
                template_type: notificationData.template.type,
                recipients: notificationData.recipients,
                data: notificationData.data,
                scheduled_for: notificationData.scheduledFor?.toISOString(),
                expires_at: notificationData.expiresAt?.toISOString(),
                status: 'scheduled',
                created_at: new Date().toISOString()
            };

            const { data, error } = await supabaseAdmin
                .from('scheduled_notifications')
                .insert([notificationRecord])
                .select()
                .single();

            if (error) {
                throw error;
            }

            logger.info('Notification scheduled', { id: data.id });
            return data.id;

        } catch (error) {
            logger.error('Failed to schedule notification:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('notification_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return data || [];

        } catch (error) {
            logger.error('Failed to get notification history:', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    private async processRecipient(notificationData: NotificationData, recipient: NotificationRecipient): Promise<void> {
        const { template } = notificationData;
        const preferences = recipient.preferences || this.getDefaultPreferences();

        // Check quiet hours
        if (this.isQuietHours(preferences)) {
            await this.scheduleForLater(notificationData, recipient);
            return;
        }

        // Process each enabled channel
        for (const channel of template.channels) {
            if (preferences[channel]) {
                await this.sendViaChannel(channel, template, recipient, notificationData.data);
            }
        }
    }

    private async sendViaChannel(
        channel: string, 
        template: NotificationTemplate, 
        recipient: NotificationRecipient, 
        data?: Record<string, any>
    ): Promise<void> {
        try {
            switch (channel) {
                case 'email':
                    await this.sendEmail(template, recipient, data);
                    break;
                case 'sms':
                    await this.sendSMS(template, recipient, data);
                    break;
                case 'push':
                    await this.sendPush(template, recipient, data);
                    break;
                case 'in_app':
                    await this.sendInApp(template, recipient, data);
                    break;
                default:
                    logger.warn('Unsupported notification channel', { channel });
            }
        } catch (error) {
            logger.error('Channel delivery failed:', {
                channel,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async sendEmail(template: NotificationTemplate, recipient: NotificationRecipient, data?: Record<string, any>): Promise<void> {
        // Email implementation would go here
        logger.info('Email notification sent', { email: recipient.email });
    }

    private async sendSMS(template: NotificationTemplate, recipient: NotificationRecipient, data?: Record<string, any>): Promise<void> {
        // SMS implementation would go here
        logger.info('SMS notification sent', { phone: recipient.phone });
    }

    private async sendPush(template: NotificationTemplate, recipient: NotificationRecipient, data?: Record<string, any>): Promise<void> {
        // Push notification implementation would go here
        logger.info('Push notification sent', { token: recipient.pushToken });
    }

    private async sendInApp(template: NotificationTemplate, recipient: NotificationRecipient, data?: Record<string, any>): Promise<void> {
        // In-app notification implementation would go here
        if (recipient.userId) {
            await supabaseAdmin
                .from('in_app_notifications')
                .insert([{
                    user_id: recipient.userId,
                    title: template.title,
                    body: template.body,
                    priority: template.priority,
                    read: false,
                    created_at: new Date().toISOString()
                }]);
        }
    }

    private isQuietHours(preferences: NotificationPreferences): boolean {
        if (!preferences.quiet_hours.enabled) return false;
        
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        return currentTime >= preferences.quiet_hours.start && currentTime <= preferences.quiet_hours.end;
    }

    private async scheduleForLater(notificationData: NotificationData, recipient: NotificationRecipient): Promise<void> {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // Schedule for 9 AM tomorrow
        
        await this.scheduleNotification({
            ...notificationData,
            recipients: [recipient],
            scheduledFor: tomorrow
        });
    }

    private getDefaultPreferences(): NotificationPreferences {
        return {
            email: true,
            sms: false,
            push: true,
            in_app: true,
            frequency: 'immediate',
            quiet_hours: {
                enabled: true,
                start: '22:00',
                end: '08:00'
            }
        };
    }

    private initializeDefaultTemplates(): void {
        const defaultTemplates: NotificationTemplate[] = [
            {
                type: 'visit_scheduled',
                title: 'Visit Scheduled',
                body: 'A new visit has been scheduled for {{date}} at {{time}}',
                priority: 'MEDIUM',
                channels: ['email', 'in_app']
            },
            {
                type: 'visit_reminder',
                title: 'Visit Reminder',
                body: 'You have a visit tomorrow at {{time}} for {{installation}}',
                priority: 'HIGH',
                channels: ['email', 'sms', 'push']
            },
            {
                type: 'contract_expiring',
                title: 'Contract Expiring',
                body: 'Contract {{contract_code}} expires in {{days}} days',
                priority: 'HIGH',
                channels: ['email', 'in_app']
            }
        ];

        defaultTemplates.forEach(template => {
            this.templates.set(template.type, template);
        });
    }
}