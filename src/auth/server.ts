import http from 'http';
import { URL } from 'url';
import axios from 'axios';
import { setupPage, successPage, errorPage } from './pages.js';
import { saveConfig, loadConfig, saveClientCredentials, hasClientCredentials, clearClientCredentials } from '../config.js';

const PORT = 8111;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const REQUIRED_SCOPES = 'profile:read_all,activity:read_all,activity:read,profile:write';

export interface AuthResult {
    success: boolean;
    message: string;
    athleteName?: string;
}

/**
 * Starts the OAuth flow and returns when complete
 */
export function startAuthServer(): Promise<AuthResult> {
    return new Promise((resolve) => {
        let server: http.Server;
        let resolved = false;
        
        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                server?.close();
                resolve({
                    success: false,
                    message: 'Authentication timed out. Please try again.',
                });
            }
        }, 5 * 60 * 1000);
        
        const finish = (result: AuthResult) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                // Give the browser time to render the response before closing
                setTimeout(() => {
                    server?.close();
                }, 1000);
                resolve(result);
            }
        };

        server = http.createServer(async (req, res) => {
            const url = new URL(req.url || '/', `http://localhost:${PORT}`);
            
            try {
                if (url.pathname === '/setup' && req.method === 'GET') {
                    // Show setup form
                    const config = await loadConfig();
                    if (hasClientCredentials(config)) {
                        // Already have credentials, redirect to auth
                        res.writeHead(302, { Location: '/auth' });
                        res.end();
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(setupPage());
                    }
                }
                else if (url.pathname === '/setup' && req.method === 'POST') {
                    // Handle form submission
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', async () => {
                        const params = new URLSearchParams(body);
                        const clientId = params.get('clientId')?.trim();
                        const clientSecret = params.get('clientSecret')?.trim();
                        
                        if (!clientId || !clientSecret) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(setupPage('Please enter both Client ID and Client Secret.'));
                            return;
                        }
                        
                        // Save credentials
                        await saveClientCredentials(clientId, clientSecret);
                        
                        // Redirect to Strava OAuth
                        const authUrl = buildAuthUrl(clientId);
                        res.writeHead(302, { Location: authUrl });
                        res.end();
                    });
                }
                else if (url.pathname === '/auth') {
                    // Redirect to Strava OAuth
                    const config = await loadConfig();
                    if (!hasClientCredentials(config)) {
                        res.writeHead(302, { Location: '/setup' });
                        res.end();
                        return;
                    }
                    
                    const authUrl = buildAuthUrl(config.clientId!);
                    res.writeHead(302, { Location: authUrl });
                    res.end();
                }
                else if (url.pathname === '/callback') {
                    // Handle OAuth callback
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');
                    
                    if (error) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(errorPage('Authorization denied', error));
                        finish({
                            success: false,
                            message: `Authorization denied: ${error}`,
                        });
                        return;
                    }
                    
                    if (!code) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(errorPage('No authorization code received'));
                        finish({
                            success: false,
                            message: 'No authorization code received from Strava.',
                        });
                        return;
                    }
                    
                    // Exchange code for tokens
                    try {
                        const config = await loadConfig();
                        const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
                            client_id: config.clientId,
                            client_secret: config.clientSecret,
                            code: code,
                            grant_type: 'authorization_code',
                        });
                        
                        const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;
                        
                        // Save tokens
                        await saveConfig({
                            accessToken: access_token,
                            refreshToken: refresh_token,
                            expiresAt: expires_at,
                        });
                        
                        // Update process.env for immediate use
                        process.env.STRAVA_ACCESS_TOKEN = access_token;
                        process.env.STRAVA_REFRESH_TOKEN = refresh_token;
                        
                        const athleteName = athlete ? `${athlete.firstname} ${athlete.lastname}` : undefined;
                        
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(successPage(athleteName));
                        
                        finish({
                            success: true,
                            message: 'Successfully connected to Strava!',
                            athleteName,
                        });
                    } catch (err: any) {
                        await clearClientCredentials();
                        const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(errorPage('Failed to exchange authorization code', errorMsg));
                        finish({
                            success: false,
                            message: `Failed to complete authentication: ${errorMsg}`,
                        });
                    }
                }
                else if (url.pathname === '/') {
                    // Root redirects to setup
                    res.writeHead(302, { Location: '/setup' });
                    res.end();
                }
                else {
                    // 404
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
            } catch (err: any) {
                console.error('Auth server error:', err);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(errorPage('Server error', err.message));
            }
        });
        
        server.listen(PORT, () => {
            console.error(`Auth server listening on http://localhost:${PORT}`);
        });
        
        server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                finish({
                    success: false,
                    message: `Port ${PORT} is already in use. Please close any other applications using this port and try again.`,
                });
            } else {
                finish({
                    success: false,
                    message: `Failed to start auth server: ${err.message}`,
                });
            }
        });
    });
}

/**
 * Builds the Strava OAuth authorization URL
 */
function buildAuthUrl(clientId: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        approval_prompt: 'force',
        scope: REQUIRED_SCOPES,
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Gets the URL to open for the auth flow
 */
export function getAuthUrl(): string {
    return `http://localhost:${PORT}/setup`;
}

/**
 * Gets the port the auth server runs on
 */
export function getAuthPort(): number {
    return PORT;
}
