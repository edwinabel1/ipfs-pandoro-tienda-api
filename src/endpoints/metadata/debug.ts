import { Context } from "hono";
import { OpenAPIRouteSchema } from "hono-openapi";

// 定义 OpenAPI 路由的 Schema
export const debugSchema: OpenAPIRouteSchema = {
  summary: "Get metadata debug information",
  description: "Retrieve all metadata stored in the Durable Object, including cached and persisted data.",
  tags: ["Metadata"],
  responses: {
    200: {
      description: "Debug information retrieved successfully",
      content: {
        "application/json": {
          example: {
            stored: {
              fileKey12345: {
                metadata: { path: "folder1/descarga.jpeg", "replica-count": 2 },
                expiresAt: 1700000000000
              }
            },
            cache: [
              [
                "fileKey12345",
                {
                  metadata: { path: "folder1/descarga.jpeg", "replica-count": 2 },
                  expiresAt: 1700000000000
                }
              ]
            ]
          }
        }
      }
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          example: {
            error: "Internal server error"
          }
        }
      }
    }
  }
};

// 定义路由逻辑
export const debugHandler = async (c: Context) => {
  try {
    const env = c.env;

    // 检查 METADATA_STORE 是否配置正确
    if (!env.METADATA_STORE) {
      return c.json({ error: "METADATA_STORE is not configured" }, 500);
    }

    // 获取 Durable Object 实例
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 调用 Durable Object 的 `/debug` 路径
	const durableObjectUrl = new URL(`/filemeta/debug`, c.req.url).toString();
    const response = await metadataStore.fetch(durableObjectUrl);

    // 确保返回的响应可以被解析为 JSON
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: errorText }, response.status);
    }

    const debugData = await response.json();
    return c.json(debugData, 200);

  } catch (error) {
    // 捕获错误并返回
    console.error("Error in /api/metadata/debug:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};
