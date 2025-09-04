import WebSocket from 'ws';
import { Logger } from '../types';
import { IncomingMessage } from 'http';

const logger: Logger = require('../utils/logger');

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

/**
 * WebSocket Manager
 * Handles real-time communications and notifications
 */
class WebSocketManager {
    private connections: Map<string, WebSocket>;
    private server: WebSocket.Server | null;

    constructor() {
        this.connections = new Map(); // userId -> WebSocket connection
        this.server = null;
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server: any): void {
        this.server = new WebSocket.Server({ server });
        
        this.server.on('connection', (ws: WebSocket, request: IncomingMessage) => {
            this.handleConnection(ws, request);
        });

        logger.info('WebSocket server initialized');
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket, request: IncomingMessage): void {
        // Extract user ID from connection (would be implemented based on auth)
        const userId = this.extractUserIdFromRequest(request);
        
        if (userId) {
            this.connections.set(userId, ws);
            logger.info('WebSocket connection established', { userId });
        }

        ws.on('close', () => {
            if (userId) {
                this.connections.delete(userId);
                logger.info('WebSocket connection closed', { userId });
            }
        });

        ws.on('error', (error: Error) => {
            logger.error('WebSocket error:', { error: error.message });
        });
    }

    /**
     * Send message to specific user
     */
    async sendToUser(userId: string, message: WebSocketMessage): Promise<boolean> {
        const connection = this.connections.get(userId);
        
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(message));
            return true;
        }
        
        return false;
    }

    /**
     * Broadcast message to all connected users
     */
    async broadcast(message: WebSocketMessage): Promise<number> {
        let sentCount = 0;
        
        this.connections.forEach((connection, userId) => {
            if (connection.readyState === WebSocket.OPEN) {
                connection.send(JSON.stringify(message));
                sentCount++;
            }
        });
        
        return sentCount;
    }

    /**
     * Get active connection count
     */
    getActiveConnectionCount(): number {
        return this.connections.size;
    }

    /**
     * Extract user ID from request (placeholder)
     */
    private extractUserIdFromRequest(request: IncomingMessage): string | null {
        // This would extract user ID from JWT token or session
        return null; // Placeholder
    }

    /**
     * Cleanup and close all connections
     */
    cleanup(): void {
        this.connections.forEach((connection) => {
            if (connection.readyState === WebSocket.OPEN) {
                connection.close();
            }
        });
        this.connections.clear();
        
        if (this.server) {
            this.server.close();
        }
    }
}

export default WebSocketManager;