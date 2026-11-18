import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios, { type InternalAxiosRequestConfig } from "axios";

// The real clearConfig deletes ~/.config/strava-mcp/config.json, so the config
// module is always mocked here: these tests must never touch a real config file.
vi.mock("../src/config.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/config.js")>()),
    loadConfig: vi.fn(),
    clearConfig: vi.fn(),
}));

import { clearConfig, loadConfig } from "../src/config.js";
import { DEFAULT_STRAVA_API_BASE_URL, getStravaApiBaseUrl, revokeToken, stravaApi } from "../src/stravaClient.js";
import { disconnectStravaTool } from "../src/tools/connectStrava.js";

const NEW_BASE_URL = "https://www.api-v3.strava.com";

// Runs a request through the real interceptors and returns the final URL,
// without any network access.
async function resolvedUrl(path: string): Promise<string> {
    const adapter = async (config: InternalAxiosRequestConfig) => ({
        data: {}, status: 200, statusText: "OK", headers: {}, config,
    });
    const response = await stravaApi.get(path, { adapter });
    return axios.getUri(response.config);
}

describe("Strava API base URL", () => {
    let previous: string | undefined;

    beforeEach(() => {
        previous = process.env.STRAVA_API_BASE_URL;
        delete process.env.STRAVA_API_BASE_URL;
    });

    afterEach(() => {
        if (previous === undefined) delete process.env.STRAVA_API_BASE_URL;
        else process.env.STRAVA_API_BASE_URL = previous;
    });

    it("defaults to the current Strava API URL", async () => {
        expect(getStravaApiBaseUrl()).toBe(DEFAULT_STRAVA_API_BASE_URL);
        expect(await resolvedUrl("athlete")).toBe("https://www.strava.com/api/v3/athlete");
    });

    it("uses STRAVA_API_BASE_URL when it is set", async () => {
        process.env.STRAVA_API_BASE_URL = NEW_BASE_URL;

        expect(await resolvedUrl("athlete")).toBe(`${NEW_BASE_URL}/athlete`);
        expect(await resolvedUrl("/athlete/zones")).toBe(`${NEW_BASE_URL}/athlete/zones`);
    });

    it("picks up an override set after the client was created", async () => {
        expect(await resolvedUrl("athlete")).toBe("https://www.strava.com/api/v3/athlete");

        process.env.STRAVA_API_BASE_URL = NEW_BASE_URL;

        expect(await resolvedUrl("athlete")).toBe(`${NEW_BASE_URL}/athlete`);
    });

    it("ignores surrounding whitespace and trailing slashes", async () => {
        process.env.STRAVA_API_BASE_URL = `  ${NEW_BASE_URL}//  `;

        expect(getStravaApiBaseUrl()).toBe(NEW_BASE_URL);
        expect(await resolvedUrl("activities/123")).toBe(`${NEW_BASE_URL}/activities/123`);
    });

    it("treats an empty value as unset", () => {
        process.env.STRAVA_API_BASE_URL = "   ";

        expect(getStravaApiBaseUrl()).toBe(DEFAULT_STRAVA_API_BASE_URL);
    });

    it("rejects a value that is not an http(s) URL", async () => {
        process.env.STRAVA_API_BASE_URL = "not a url";
        expect(() => getStravaApiBaseUrl()).toThrow("STRAVA_API_BASE_URL is not a valid URL");
        await expect(resolvedUrl("athlete")).rejects.toThrow("STRAVA_API_BASE_URL is not a valid URL");

        process.env.STRAVA_API_BASE_URL = "ftp://example.com";
        expect(() => getStravaApiBaseUrl()).toThrow("must be an http(s) URL");
    });
});

describe("revokeToken", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("posts the token to oauth/revoke with HTTP Basic client credentials", async () => {
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        await revokeToken({ token: "refresh-123", clientId: "12345", clientSecret: "abc123", tokenTypeHint: "refresh_token" });

        expect(post).toHaveBeenCalledTimes(1);
        const [url, body, config] = post.mock.calls[0]!;
        expect(url).toBe("https://www.strava.com/oauth/revoke");
        expect(body).toBe("token=refresh-123&token_type_hint=refresh_token");
        expect(config?.auth).toEqual({ username: "12345", password: "abc123" });
        expect(config?.headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });
    });

    it("omits token_type_hint when none is given", async () => {
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        await revokeToken({ token: "access-123", clientId: "12345", clientSecret: "abc123" });

        expect(post.mock.calls[0]?.[1]).toBe("token=access-123");
    });
});

describe("disconnect-strava tool", () => {
    const savedEnv: Record<string, string | undefined> = {};
    const fullConfig = { clientId: "12345", clientSecret: "abc123", accessToken: "access-123", refreshToken: "refresh-123" };

    beforeEach(() => {
        for (const key of ["STRAVA_ACCESS_TOKEN", "STRAVA_REFRESH_TOKEN"]) {
            savedEnv[key] = process.env[key];
            process.env[key] = "placeholder";
        }
        vi.mocked(loadConfig).mockReset();
        vi.mocked(clearConfig).mockReset().mockResolvedValue(undefined);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        for (const [key, value] of Object.entries(savedEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        vi.restoreAllMocks();
    });

    it("revokes the refresh token on Strava, then clears local credentials", async () => {
        vi.mocked(loadConfig).mockResolvedValue(fullConfig);
        const order: string[] = [];
        const post = vi.spyOn(axios, "post").mockImplementation(async () => { order.push("revoke"); return { status: 200, data: "" }; });
        vi.mocked(clearConfig).mockImplementation(async () => { order.push("clear"); });

        const result = await disconnectStravaTool.execute({});

        expect(order).toEqual(["revoke", "clear"]);
        expect(post.mock.calls[0]?.[1]).toBe("token=refresh-123&token_type_hint=refresh_token");
        expect(process.env.STRAVA_ACCESS_TOKEN).toBeUndefined();
        expect(process.env.STRAVA_REFRESH_TOKEN).toBeUndefined();
        expect(result.content[0]?.text).toContain("Access was revoked on Strava.");
    });

    it("falls back to the access token when there is no refresh token", async () => {
        vi.mocked(loadConfig).mockResolvedValue({ ...fullConfig, refreshToken: undefined });
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        await disconnectStravaTool.execute();

        expect(post.mock.calls[0]?.[1]).toBe("token=access-123&token_type_hint=access_token");
    });

    it("still clears local credentials when the revoke call fails", async () => {
        vi.mocked(loadConfig).mockResolvedValue(fullConfig);
        vi.spyOn(axios, "post").mockRejectedValue(new Error("Request failed with status code 503"));

        const result = await disconnectStravaTool.execute({});

        expect(clearConfig).toHaveBeenCalledTimes(1);
        expect(process.env.STRAVA_ACCESS_TOKEN).toBeUndefined();
        expect(result.content[0]?.text).toContain("Your stored credentials have been removed.");
        expect(result.content[0]?.text).toContain("could not be revoked on Strava (Request failed with status code 503)");
        expect(result.content[0]?.text).not.toContain("refresh-123");
    });

    it("does not call Strava when revoke is false", async () => {
        vi.mocked(loadConfig).mockResolvedValue(fullConfig);
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        const result = await disconnectStravaTool.execute({ revoke: false });

        expect(post).not.toHaveBeenCalled();
        expect(clearConfig).toHaveBeenCalledTimes(1);
        expect(result.content[0]?.text).toContain("Access was not revoked on Strava.");
    });

    it("skips the revoke call when client credentials are missing", async () => {
        vi.mocked(loadConfig).mockResolvedValue({ accessToken: "access-123", refreshToken: "refresh-123" });
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        const result = await disconnectStravaTool.execute({});

        expect(post).not.toHaveBeenCalled();
        expect(clearConfig).toHaveBeenCalledTimes(1);
        expect(result.content[0]?.text).toContain("Client ID and Client Secret are missing");
    });

    it("skips the revoke call when there is no stored token", async () => {
        vi.mocked(loadConfig).mockResolvedValue({ clientId: "12345", clientSecret: "abc123" });
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status: 200, data: "" });

        const result = await disconnectStravaTool.execute({});

        expect(post).not.toHaveBeenCalled();
        expect(result.content[0]?.text).toContain("no stored token to revoke");
    });
});
