export const MetadataRemoveAll = async (c: Context) => {
  try {
    // 获取 Durable Object 的实例
    const env = c.env;
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 调用 Durable Object 的 `/remove-all` 路由
    const durableObjectUrl = new URL(`/filemeta/remove-all`, c.req.url).toString();
    const response = await metadataStore.fetch(durableObjectUrl, { method: "POST" });

    if (!response.ok) {
      // 如果请求失败，返回错误信息和状态码
      const errorMessage = await response.text();
      return c.json({ error: errorMessage }, response.status);
    }

    return c.json({ success: true, message: "All metadata removed successfully." }, 200);
  } catch (error) {
    console.error("Error removing all metadata:", error);
    return c.json({ error: "Failed to remove all metadata." }, 500);
  }
};
