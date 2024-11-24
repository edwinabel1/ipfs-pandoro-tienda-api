import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from 'hono/cors';
import { CodeGenerate } from "./endpoints/codes/codeGenerate";
import { CodeRedeem } from "./endpoints/codes/codeRedeem";
import { UploadQuota } from "./endpoints/siteSessions/uploadQuota";
import { UploadRequest } from "./endpoints/siteSessions/uploadRequest";
import { MultipartInit } from "./endpoints/siteSessions/multipart/multipartInit";
import { MultipartPart } from "./endpoints/siteSessions/multipart/multipartPart";
import { MultipartComplete } from "./endpoints/siteSessions/multipart/multipartComplete";
import { MetadataStore } from "./objects/MetadataStore"
import { MetadataGet } from "./endpoints/metadata/metadataGet";
import { debugSchema, debugHandler } from "./endpoints/metadata/debug";
import { MetadataRemoveAll } from "./endpoints/metadata/removeAll";
import { OrderManager } from "./objects/OrderManager"
import { createOrder, getOrderStatus, updateOrder, debugOrders } from "./endpoints/orders/orders";
import { R2ToCidMapping } from "./objects/R2ToCidMapping"
import { addMapping, getMapping, deleteMapping, debugMapping } from "./endpoints/r2cid/r2Cid";

// Start a Hono app
const app = new Hono();

// 添加 CORS 支持
app.use(
  '*',
  cors({
    origin: '*', // 或指定来源，例如 'http://127.0.0.1:8080'
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

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

// 注册 Metadata Get API
openapi.get("/api/metadata/get", MetadataGet);
openapi.post("/api/metadata/remove-all", MetadataRemoveAll);
openapi.get("/api/metadata/debug", debugHandler, debugSchema);

// 注册 Orders API
openapi.get('/api/orders/debug', debugOrders.handler, debugOrders.schema);
openapi.post("/api/orders", createOrder.handler, createOrder.schema); // 创建订单
openapi.get("/api/orders/status", getOrderStatus.handler, getOrderStatus.schema); // 查询订单状态
openapi.put("/api/orders/update", updateOrder.handler, updateOrder.schema); // 更新订单状态

// 注册 R2ToCidMapping API
openapi.post("/api/r2-cid/add", addMapping.handler, addMapping.schema); // 添加映射
openapi.get("/api/r2-cid/get", getMapping.handler, getMapping.schema); // 查询映射
openapi.delete("/api/r2-cid/delete", deleteMapping.handler, deleteMapping.schema); // 删除映射
openapi.get("/api/r2-cid/debug", debugMapping.handler, debugMapping.schema);

export { MetadataStore };
export { OrderManager };
export { R2ToCidMapping };

// Export the Hono app
export default app;
