import axios, { AxiosRequestConfig } from "axios";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { setSecret } from "@actions/core";
import { context } from "@actions/github";

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

    const { payload } = context;
    headers["GITHUB_SHA"] =
        process.env["GITHUB_EVENT_NAME"] === "pull_request"
            ? ((((payload || {}).pull_request || {}) as any).head || {}).sha
            : process.env["GITHUB_SHA"];

    config.headers = headers;
    return config;
};

export class S3Proxy {
    constructor(private endpoint: string) {}

    public async UploadFile(Bucket: string, Key: string, filename: string): Promise<void> {
        const contents = readFileSync(filename);
        const md5 = createHash("md5", { encoding: "base64" })
            .update(contents)
            .digest();

        const interceptor = axios.interceptors.request.use(addHeaders);

        const { data: signedUrl } = await axios.post<string>(`${this.endpoint}/presigned`, {
            Bucket,
            Key,
            Expires: 300,
            "Content-Md5": md5,
            "Content-Type": "application/zip",
        });

        setSecret(signedUrl);

        axios.interceptors.request.eject(interceptor);

        await axios.post(signedUrl, contents, {
            headers: {
                "Content-Type": "application/zip",
            },
        });
    }
}
