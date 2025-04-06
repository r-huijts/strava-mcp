import axios from 'axios';
import * as dotenv from 'dotenv';
import * as readline from 'readline/promises';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define required scopes for all current and planned tools
// Explicitly request profile and activity read access.
const REQUIRED_SCOPES = 'profile:read_all,activity:read_all';
const REDIRECT_URI = 'http://localhost'; // Must match one configured in Strava App settings

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptUser(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function loadEnv(): Promise<{ clientId?: string; clientSecret?: string }> {
  try {
    await fs.access(envPath); // Check if .env exists
    const envConfig = dotenv.parse(await fs.readFile(envPath));
    return {
      clientId: envConfig.STRAVA_CLIENT_ID,
      clientSecret: envConfig.STRAVA_CLIENT_SECRET,
    };
  } catch (error) {
    console.log('.env file not found or not readable. Will prompt for all values.');
    return {};
  }
}

async function updateEnvFile(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  let envContent = '';
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch (error) {
    console.log('.env file not found, creating a new one.');
  }

  const lines = envContent.split('\n');
  const newLines: string[] = [];
  let accessTokenUpdated = false;
  let refreshTokenUpdated = false;

  for (const line of lines) {
    if (line.startsWith('STRAVA_ACCESS_TOKEN=')) {
      newLines.push(`STRAVA_ACCESS_TOKEN=${tokens.accessToken}`);
      accessTokenUpdated = true;
    } else if (line.startsWith('STRAVA_REFRESH_TOKEN=')) {
      newLines.push(`STRAVA_REFRESH_TOKEN=${tokens.refreshToken}`);
      refreshTokenUpdated = true;
    } else if (line.trim() !== '') {
      newLines.push(line);
    }
  }

  if (!accessTokenUpdated) {
    newLines.push(`STRAVA_ACCESS_TOKEN=${tokens.accessToken}`);
  }
  if (!refreshTokenUpdated) {
    newLines.push(`STRAVA_REFRESH_TOKEN=${tokens.refreshToken}`);
  }

  await fs.writeFile(envPath, newLines.join('\n').trim() + '\n');
  console.log('✅ Tokens successfully saved to .env file.');
}


async function main() {
  console.log('--- Strava API Token Setup ---');

  const existingEnv = await loadEnv();
  let clientId = existingEnv.clientId;
  let clientSecret = existingEnv.clientSecret;

  if (!clientId) {
    clientId = await promptUser('Enter your Strava Application Client ID: ');
    if (!clientId) {
      console.error('❌ Client ID is required.');
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Using Client ID from .env: ${clientId}`);
  }

  if (!clientSecret) {
    clientSecret = await promptUser('Enter your Strava Application Client Secret: ');
     if (!clientSecret) {
      console.error('❌ Client Secret is required.');
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ Using Client Secret from .env.`);
  }


  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=${REQUIRED_SCOPES}`;

  console.log('\nStep 1: Authorize Application');
  console.log('Please visit the following URL in your browser:');
  console.log(`\n${authUrl}\n`);
  console.log(`After authorizing, Strava will redirect you to ${REDIRECT_URI}.`);
  console.log('Copy the \'code\' value from the URL in your browser\'s address bar.');
  console.log('(e.g., http://localhost/?state=&code=THIS_PART&scope=...)');

  const authCode = await promptUser('\nPaste the authorization code here: ');

  if (!authCode) {
    console.error('❌ Authorization code is required.');
    process.exit(1);
  }

  console.log('\nStep 2: Exchanging code for tokens...');

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at } = response.data;

    if (!access_token || !refresh_token) {
        throw new Error('Failed to retrieve tokens from Strava.');
    }

    console.log('\n✅ Successfully obtained tokens!');
    console.log(`Access Token: ${access_token}`);
    console.log(`Refresh Token: ${refresh_token}`);
    console.log(`Access Token Expires At: ${new Date(expires_at * 1000).toLocaleString()}`);


    const save = await promptUser('\nDo you want to save these tokens to your .env file? (yes/no): ');

    if (save.toLowerCase() === 'yes' || save.toLowerCase() === 'y') {
        await updateEnvFile({ accessToken: access_token, refreshToken: refresh_token });
        // Optionally save client_id and client_secret if they weren't in .env initially
        let envContent = '';
        try {
            envContent = await fs.readFile(envPath, 'utf-8');
        } catch (readError) { /* Ignore if file doesn't exist, it was created in updateEnvFile */ }

        let needsUpdate = false;
        if (!envContent.includes('STRAVA_CLIENT_ID=')) {
            envContent = `STRAVA_CLIENT_ID=${clientId}\n` + envContent;
            needsUpdate = true;
        }
        if (!envContent.includes('STRAVA_CLIENT_SECRET=')) {
            // Add secret before tokens if they exist
            const tokenLineIndex = envContent.indexOf('STRAVA_ACCESS_TOKEN=');
            if (tokenLineIndex !== -1) {
                 envContent = envContent.substring(0, tokenLineIndex) + `STRAVA_CLIENT_SECRET=${clientSecret}\n` + envContent.substring(tokenLineIndex);
            } else {
                envContent = `STRAVA_CLIENT_SECRET=${clientSecret}\n` + envContent; // Add at the beginning if tokens aren't there
            }
            needsUpdate = true;
        }
        if (needsUpdate) {
             await fs.writeFile(envPath, envContent.trim() + '\n');
             console.log('ℹ️ Client ID and Secret also saved/updated in .env.');
        }

    } else {
        console.log('\nTokens not saved. Please store them securely yourself.');
    }

  } catch (error: any) {
    console.error('\n❌ Error exchanging code for tokens:');
     if (axios.isAxiosError(error) && error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data)}`);
     } else {
        console.error(error.message || error);
     }
     process.exit(1);
  } finally {
    rl.close();
  }
}

main(); 