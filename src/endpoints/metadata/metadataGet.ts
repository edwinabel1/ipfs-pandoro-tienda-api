import { Context } from "hono";

export const MetadataGet = async (c: Context) => {
  const key = c.req.query("key"); // 获取查询参数中的 `key`
  if (!key) {
    return c.json({ error: "Key is required" }, 400); // 如果没有提供 `key`，返回 400 错误
  }

  try {
    // 从环境中获取 Durable Object 的实例
    const env = c.env;
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 构建 Durable Object 的全路径 URL
    const durableObjectUrl = new URL(`/filemeta/get`, c.req.url).toString();

    // 调用 Durable Object 的 `/get` 路径
    const response = await metadataStore.fetch(durableObjectUrl);

    if (!response.ok) {
      // 如果请求失败，返回错误信息和状态码
      const errorMessage = await response.text();
      return c.json({ error: errorMessage }, response.status);
    }

    // 返回元数据
    const metadata = await response.json();
    return c.json(metadata, 200); // 返回 200 和元数据
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return c.json({ error: "Failed to fetch metadata" }, 500); // 返回 500 错误
  }
};
