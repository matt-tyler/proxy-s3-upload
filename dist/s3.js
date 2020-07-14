"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const core_1 = require("@actions/core");
const addHeaders = (config) => {
    const { headers } = config;
    const github = (k) => k.startsWith("GITHUB_");
    for (const k of Object.keys(process.env).filter(github)) {
        const key = `x-${k
            .toLowerCase()
            .split("_")
            .join("-")}`;
        headers[key] = process.env[k];
    }
    config.headers = headers;
    return config;
};
class S3Proxy {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    UploadFile(Bucket, Key, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const contents = fs_1.readFileSync(filename);
            const md5 = crypto_1.createHash("md5", { encoding: "base64" })
                .update(contents)
                .digest();
            const interceptor = axios_1.default.interceptors.request.use(addHeaders);
            const { data: signedUrl } = yield axios_1.default.post(`${this.endpoint}/presigned`, {
                Bucket,
                Key,
                Expires: 300,
                "Content-Md5": md5,
                "Content-Type": "application/zip",
            });
            core_1.setSecret(signedUrl);
            axios_1.default.interceptors.request.eject(interceptor);
            yield axios_1.default.post(signedUrl, contents, {
                headers: {
                    "Content-Type": "application/zip",
                },
            });
        });
    }
}
exports.S3Proxy = S3Proxy;
