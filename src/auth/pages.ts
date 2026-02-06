/**
 * HTML templates for the OAuth flow pages
 */

const baseStyles = `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e8e8e8;
    }
    .container {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 40px;
        max-width: 480px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .logo {
        font-size: 48px;
        margin-bottom: 20px;
        text-align: center;
    }
    h1 {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 12px;
        text-align: center;
        background: linear-gradient(135deg, #fc4c02, #ff6b35);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    p {
        color: #a0a0a0;
        text-align: center;
        margin-bottom: 24px;
        line-height: 1.6;
    }
    .form-group {
        margin-bottom: 20px;
    }
    label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #c0c0c0;
    }
    input {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.3);
        color: #fff;
        font-size: 16px;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
        outline: none;
        border-color: #fc4c02;
        box-shadow: 0 0 0 3px rgba(252, 76, 2, 0.2);
    }
    input::placeholder {
        color: #666;
    }
    button {
        width: 100%;
        padding: 14px 24px;
        background: linear-gradient(135deg, #fc4c02, #ff6b35);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px -5px rgba(252, 76, 2, 0.4);
    }
    button:active {
        transform: translateY(0);
    }
    .help-text {
        font-size: 13px;
        color: #888;
        margin-top: 8px;
    }
    .help-text a {
        color: #fc4c02;
        text-decoration: none;
    }
    .help-text a:hover {
        text-decoration: underline;
    }
    .success-icon {
        font-size: 64px;
        text-align: center;
        margin-bottom: 20px;
    }
    .error-icon {
        font-size: 64px;
        text-align: center;
        margin-bottom: 20px;
    }
    .error-message {
        background: rgba(220, 38, 38, 0.2);
        border: 1px solid rgba(220, 38, 38, 0.3);
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 20px;
        color: #fca5a5;
    }
`;

/**
 * Setup page - form for entering Client ID and Client Secret
 */
export function setupPage(error?: string): string {
    const errorHtml = error ? `<div class="error-message">${escapeHtml(error)}</div>` : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connect Strava - Setup</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="container">
        <div class="logo">🏃‍♂️</div>
        <h1>Connect to Strava</h1>
        <p>Enter your Strava API credentials to connect your account.</p>
        ${errorHtml}
        <form method="POST" action="/setup">
            <div class="form-group">
                <label for="clientId">Client ID</label>
                <input type="text" id="clientId" name="clientId" placeholder="Your Strava Client ID" required>
            </div>
            <div class="form-group">
                <label for="clientSecret">Client Secret</label>
                <input type="password" id="clientSecret" name="clientSecret" placeholder="Your Strava Client Secret" required>
            </div>
            <button type="submit">Continue to Strava →</button>
            <p class="help-text">
                Don't have API credentials? 
                <a href="https://www.strava.com/settings/api" target="_blank">Create a Strava App</a>
            </p>
        </form>
    </div>
</body>
</html>`;
}

/**
 * Success page - shown after successful authentication
 */
export function successPage(athleteName?: string): string {
    const greeting = athleteName ? `Welcome, ${escapeHtml(athleteName)}!` : 'Authentication successful!';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connected to Strava!</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>${greeting}</h1>
        <p>Your Strava account is now connected. You can close this tab and return to your chat.</p>
        <p style="font-size: 14px; color: #666;">
            Try saying "Show me my recent activities" to get started!
        </p>
    </div>
    <script>
        // Auto-close after 5 seconds
        setTimeout(() => {
            window.close();
        }, 5000);
    </script>
</body>
</html>`;
}

/**
 * Error page - shown when something goes wrong
 */
export function errorPage(message: string, details?: string): string {
    const detailsHtml = details ? `<p class="help-text">${escapeHtml(details)}</p>` : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connection Failed</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>Connection Failed</h1>
        <div class="error-message">${escapeHtml(message)}</div>
        ${detailsHtml}
        <button onclick="window.location.href='/setup?reset=true'">Try Again</button>
    </div>
</body>
</html>`;
}

/**
 * Waiting page - shown while waiting for user to authorize
 */
export function waitingPage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorizing...</title>
    <style>
        ${baseStyles}
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(252, 76, 2, 0.2);
            border-top-color: #fc4c02;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>Redirecting to Strava...</h1>
        <p>Please authorize the application in the Strava window.</p>
    </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char] || char);
}
