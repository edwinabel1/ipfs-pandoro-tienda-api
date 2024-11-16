import { fromHono } from "chanfana";
import { Hono } from "hono";
import { CodeGenerate } from "./endpoints/codes/codeGenerate";
import { CodeRedeem } from "./endpoints/codes/codeRedeem";
import { UploadQuota } from "./endpoints/siteSessions/uploadQuota";
import { UploadRequest } from "./endpoints/siteSessions/uploadRequest";
import { MultipartInit } from "./endpoints/siteSessions/multipart/multipartInit";
import { MultipartPart } from "./endpoints/siteSessions/multipart/multipartPart";
import { MultipartComplete } from "./endpoints/siteSessions/multipart/multipartComplete";


// Start a Hono app
const app = new Hono();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/", // OpenAPI 文档路径
});

// Register OpenAPI endpoints
openapi.post("/api/codes/generate", CodeGenerate); // 生成兑换码
openapi.post("/api/codes/redeem", CodeRedeem);    // 验证和使用兑换码
openapi.post("/api/uploads/quota", UploadQuota);

// 注册普通上传接口
openapi.post("/api/uploads/request", UploadRequest);

// 注册分片上传接口
openapi.post("/api/uploads/multipart/init", MultipartInit);
openapi.post("/api/uploads/multipart/part", MultipartPart);
openapi.post("/api/uploads/multipart/complete", MultipartComplete);

// Export the Hono app
export default app;
