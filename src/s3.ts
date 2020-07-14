import axios, { AxiosRequestConfig } from "axios";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { setSecret } from "@actions/core";
import { context } from "@actions/github";
import Webhooks from "@octokit/webhooks";

const addHeaders = (config: AxiosRequestConfig): AxiosRequestConfig => {
    const { headers } = config;
    const github = (k: string): boolean => k.startsWith("GITHUB_");
    for (const k of Object.keys(process.env).filter(github)) {
        const key = `x-${k
            .toLowerCase()
            .split("_")
            .join("-")}`;
        headers[key] = process.env[k];
    }

    let GITHUB_SHA = process.env["GITHUB_SHA"];
    const { payload } = context;
    if (process.env["GITHUB_EVENT_NAME"] === "pull_request") {
        GITHUB_SHA = (payload as Webhooks.WebhookPayloadPullRequest).pull_request.head.sha;
    }
    headers["x-github-sha"] = GITHUB_SHA;
    config.headers = headers;
    return config;
};

export class S3Proxy {
    constructor(private endpoint: string) {}

    public async UploadFile(Bucket: string, Key: string, filename: string): Promise<void> {
        const contents = readFileSync(filename);
        const md5 = createHash("md5")
            .update(contents)
            .digest("base64");

        const interceptor = axios.interceptors.request.use(addHeaders);

        const { data: signedUrl } = await axios.post<string>(`${this.endpoint}/presign`, {
            Bucket,
            Key,
            Expires: 300,
            "Content-Md5": md5.toString(),
            "Content-Type": "application/zip",
        });

        setSecret(signedUrl);
        console.log("signed url:", signedUrl);

        axios.interceptors.request.eject(interceptor);
        await axios.put(signedUrl, contents, {
            headers: {
                "Content-Type": "application/zip",
            },
        });
    }
}
