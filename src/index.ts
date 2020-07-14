import * as core from "@actions/core";
import { S3Proxy } from "./s3";

async function run(): Promise<void> {
    try {
        const endpoint = core.getInput("endpoint", { required: true });
        const bucket = core.getInput("bucket", { required: true });
        const key = core.getInput("key", { required: true });
        const filename = core.getInput("filename", { required: true });

        const proxy = new S3Proxy(endpoint);
        await proxy.UploadFile(bucket, key, filename);
    } catch (error) {
        core.setFailed(error.message);
    }
}

/* istanbul ignore next */
if (require.main === module) {
    run();
}

module.exports = run;
