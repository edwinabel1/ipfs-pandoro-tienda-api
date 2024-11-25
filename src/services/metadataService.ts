import { Context } from "hono";

export interface Metadata {
  path: string;
  replicaCount: number;
  order_id: string;
  [key: string]: any;
}

const getMetadata = async (file_id: string, c: Context): Promise<Metadata | null> => {
  try {
    const env = c.env;

    // 获取 MetadataStore Durable Object 实例
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 构建请求 URL
    const metadataUrl = new URL(`/filemeta/get?key=${encodeURIComponent(file_id)}`, c.req.url);

    // 发起请求
    const response = await metadataStore.fetch(metadataUrl.toString());

    if (!response.ok) {
      console.error(`Failed to fetch metadata for file_id: ${file_id}. Status: ${response.status}`);
      return null;
    }

    // 返回元数据
    return await response.json();
  } catch (error) {
    console.error(`Error fetching metadata for file_id: ${file_id}`, error);
    throw new Error("Failed to fetch metadata");
  }
};

const getOrderIdByFileId = async (file_id: string, c: Context): Promise<string | null> => {
  try {
    // 获取元数据
    const metadata = await getMetadata(file_id, c);

    // 提取 order_id
    if (!metadata || !metadata.order_id) {
      console.error(`Order ID not found in metadata for file_id: ${file_id}`);
      return null;
    }

    return metadata.order_id;
  } catch (error) {
    console.error(`Error fetching order ID for file_id: ${file_id}`, error);
    throw new Error("Failed to fetch order ID");
  }
};

const setMetadata = async (file_id: string, metadata: Metadata, c: Context): Promise<void> => {
  try {
    const env = c.env;

    // 获取 MetadataStore Durable Object 实例
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 构建请求 URL
    const metadataUrl = new URL(`/filemeta/set`, c.req.url);

    // 发起 POST 请求设置元数据
    const response = await metadataStore.fetch(metadataUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: file_id, metadata }),
    });

    if (!response.ok) {
      console.error(`Failed to set metadata for file_id: ${file_id}. Status: ${response.status}`);
      throw new Error("Failed to set metadata");
    }

    console.log(`Metadata set successfully for file_id: ${file_id}`);
  } catch (error) {
    console.error(`Error setting metadata for file_id: ${file_id}`, error);
    throw new Error("Failed to set metadata");
  }
};

const deleteMetadata = async (file_id: string, c: Context): Promise<void> => {
  try {
    const env = c.env;

    // 获取 MetadataStore Durable Object 实例
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 构建请求 URL
    const metadataUrl = new URL(`/filemeta/delete`, c.req.url);

    // 发起 DELETE 请求删除元数据
    const response = await metadataStore.fetch(metadataUrl.toString(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: file_id }),
    });

    if (!response.ok) {
      console.error(`Failed to delete metadata for file_id: ${file_id}. Status: ${response.status}`);
      throw new Error("Failed to delete metadata");
    }

    console.log(`Metadata deleted successfully for file_id: ${file_id}`);
  } catch (error) {
    console.error(`Error deleting metadata for file_id: ${file_id}`, error);
    throw new Error("Failed to delete metadata");
  }
};

const debugMetadata = async (c: Context): Promise<Object> => {
  const env = c.env;
  const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
  const metadataStore = env.METADATA_STORE.get(metadataStoreId);

  try {
    // 请求 Durable Object 获取所有元数据
    const response = await metadataStore.fetch(new URL("/filemeta/debug", c.req.url).toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error debugging metadata:", error);
    throw new Error("Failed to debug metadata");
  }
};

  /**
   * 删除所有 metadata
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<void>}
   */
const removeAllMetadata = async (c: Context): Promise<void> => {
  const env = c.env;
  if (!env.METADATA_STORE) {
    throw new Error("METADATA_STORE is not initialized in the environment.");
  }

  const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
  const metadataStore = env.METADATA_STORE.get(metadataStoreId);

  try {
    const durableObjectUrl = new URL(`/filemeta/remove-all`, c.req.url).toString();

    const response = await metadataStore.fetch(durableObjectUrl, { method: "POST" });

    if (!response.ok) {
      throw new Error(`Failed to remove all metadata: ${await response.text()}`);
    }

    console.log("All metadata removed successfully.");
  } catch (error) {
    console.error("Error in removeAllMetadata:", error);
    throw new Error("Failed to remove all metadata.");
  }
};

export default {
  getMetadata,
  getOrderIdByFileId,
  setMetadata,
  deleteMetadata,
  debugMetadata,
  removeAllMetadata,
};
