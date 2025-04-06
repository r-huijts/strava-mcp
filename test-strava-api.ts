import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Environment Variable Loading ---
// Explicitly load .env from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env'); // Assumes test script is in root, .env is in root
console.log(`[TEST] Attempting to load .env file from: ${envPath}`);
dotenv.config({ path: envPath });

// Get the token
const accessToken = process.env.STRAVA_ACCESS_TOKEN;

// Basic validation
if (!accessToken || accessToken === 'YOUR_STRAVA_ACCESS_TOKEN_HERE') {
  console.error('❌ Error: STRAVA_ACCESS_TOKEN is not set or is a placeholder in the .env file.');
  process.exit(1);
}

console.log(`[TEST] Using token: ${accessToken.substring(0, 5)}...${accessToken.slice(-5)}`);

// Function to test the /athlete endpoint
async function testAthleteCall() {
    console.log("--- Testing /athlete Endpoint ---");
    if (!accessToken) {
        console.error("❌ STRAVA_ACCESS_TOKEN is not set in the .env file or environment.");
        return;
    }
    console.log(`Using token: ${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}`);

    try {
        const response = await axios.get('https://www.strava.com/api/v3/athlete', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log("✅ Request to /athlete successful:", response.status);
        console.log("Athlete Data:", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("❌ Error calling /athlete:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
     console.log("-------------------------------\n");
}

// Function to test the /athlete/activities endpoint
async function testActivitiesCall() {
    console.log("--- Testing /athlete/activities Endpoint ---");
     if (!accessToken) {
        console.error("❌ STRAVA_ACCESS_TOKEN is not set in the .env file or environment.");
        return;
    }
    console.log(`Using token: ${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}`);
    const perPage = 5; // Fetch 5 activities for the test

    try {
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                per_page: perPage
            }
        });
        console.log(`✅ Request to /athlete/activities successful:`, response.status);
        console.log(`Received ${response.data?.length ?? 0} activities.`);
        // Optionally log activity names or IDs
        if(response.data && response.data.length > 0) {
            console.log("First activity name:", response.data[0].name);
        }
    } catch (error: any) {
        console.error("❌ Error calling /athlete/activities:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
    console.log("---------------------------------------\n");
}

// Run the tests
(async () => {
    await testAthleteCall();
    await testActivitiesCall();
})(); 