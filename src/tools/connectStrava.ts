import { z } from 'zod';
import { loadConfig, hasValidTokens, hasClientCredentials, getConfigPath } from '../config.js';
import { startAuthServer, getAuthUrl } from '../auth/server.js';
import { getAuthenticatedAthlete } from '../stravaClient.js';

// Dynamic import for 'open' package (ESM)
async function openBrowser(url: string): Promise<void> {
    try {
        const open = (await import('open')).default;
        await open(url);
    } catch (err) {
        // If open fails, user will need to manually open the URL
        console.error('Could not auto-open browser:', err);
    }
}

export const connectStravaTool = {
    name: 'connect-strava',
    description: 'Connect your Strava account to enable activity tracking. This will open a browser window for secure authentication. Use this when the user asks to connect, link, or authenticate their Strava account.',
    inputSchema: z.object({
        force: z.boolean().optional().describe('Force re-authentication even if already connected'),
    }),
    execute: async (args: { force?: boolean }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
        const { force = false } = args;
        
        try {
            // Check if already authenticated
            if (!force) {
                const config = await loadConfig();
                if (hasValidTokens(config)) {
                    // Try to verify the tokens work
                    try {
                        const token = config.accessToken!;
                        const athlete = await getAuthenticatedAthlete(token);
                        return {
                            content: [{
                                type: 'text' as const,
                                text: `✅ Already connected to Strava as ${athlete.firstname} ${athlete.lastname}.\n\nYou can ask me about your activities, stats, routes, and more!\n\nIf you want to connect a different account, use the force option.`,
                            }],
                        };
                    } catch {
                        // Token might be expired, continue to re-auth
                    }
                }
            }
            
            // Start the auth flow
            const authUrl = getAuthUrl();
            
            // Open browser
            await openBrowser(authUrl);
            
            // Return immediately with instructions while server runs
            const serverPromise = startAuthServer();
            
            // Wait for auth to complete
            const result = await serverPromise;
            
            if (result.success) {
                const greeting = result.athleteName 
                    ? `Welcome, ${result.athleteName}! 🎉`
                    : 'Successfully connected! 🎉';
                
                return {
                    content: [{
                        type: 'text' as const,
                        text: `✅ ${greeting}\n\nYour Strava account is now connected. You can ask me about:\n• Your recent activities\n• Training statistics\n• Routes and segments\n• And much more!\n\nTry asking: "Show me my recent activities" or "What are my stats for this year?"`,
                    }],
                };
            } else {
                return {
                    content: [{
                        type: 'text' as const,
                        text: `❌ ${result.message}\n\nPlease try again. If the issue persists, make sure:\n1. You have a Strava API application (create one at https://www.strava.com/settings/api)\n2. The Authorization Callback Domain is set to "localhost"\n3. You're using the correct Client ID and Client Secret`,
                    }],
                };
            }
        } catch (error: any) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `❌ Error connecting to Strava: ${error.message}\n\nPlease try again. If the browser didn't open, visit: ${getAuthUrl()}`,
                }],
            };
        }
    },
};

export const disconnectStravaTool = {
    name: 'disconnect-strava',
    description: 'Disconnect your Strava account and remove stored credentials. Use this when the user wants to logout, disconnect, or remove their Strava connection.',
    inputSchema: z.object({}),
    execute: async (): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
        try {
            const { clearConfig } = await import('../config.js');
            await clearConfig();
            
            // Clear from process.env as well
            delete process.env.STRAVA_ACCESS_TOKEN;
            delete process.env.STRAVA_REFRESH_TOKEN;
            
            return {
                content: [{
                    type: 'text' as const,
                    text: '✅ Disconnected from Strava. Your credentials have been removed.\n\nTo reconnect, just say "Connect my Strava account".',
                }],
            };
        } catch (error: any) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `❌ Error disconnecting: ${error.message}`,
                }],
            };
        }
    },
};

export const checkStravaConnectionTool = {
    name: 'check-strava-connection',
    description: 'Check if Strava is connected and show the current connection status. Use this when the user asks about their connection status.',
    inputSchema: z.object({}),
    execute: async (): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
        try {
            const config = await loadConfig();
            
            if (!hasClientCredentials(config) && !hasValidTokens(config)) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: '❌ Not connected to Strava.\n\nSay "Connect my Strava account" to get started!',
                    }],
                };
            }
            
            if (!hasValidTokens(config)) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: '⚠️ Strava credentials found but not fully authenticated.\n\nSay "Connect my Strava account" to complete the connection.',
                    }],
                };
            }
            
            // Try to verify the connection
            try {
                const token = config.accessToken!;
                const athlete = await getAuthenticatedAthlete(token);
                return {
                    content: [{
                        type: 'text' as const,
                        text: `✅ Connected to Strava as ${athlete.firstname} ${athlete.lastname}\n\n📍 ${athlete.city || 'Location not set'}, ${athlete.country || ''}\n🏅 ${athlete.premium ? 'Premium' : 'Free'} account\n\nConfig stored at: ${getConfigPath()}`,
                    }],
                };
            } catch {
                return {
                    content: [{
                        type: 'text' as const,
                        text: '⚠️ Connection may have expired.\n\nSay "Connect my Strava account" to refresh the connection.',
                    }],
                };
            }
        } catch (error: any) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `❌ Error checking connection: ${error.message}`,
                }],
            };
        }
    },
};
