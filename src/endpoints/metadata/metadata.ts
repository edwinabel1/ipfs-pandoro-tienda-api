import { Context } from "hono";
import metadataService from "../../services/metadataService";

/**
 * 获取元数据
 */
export const getMetadata = async (c: Context) => {
  const file_id = c.req.query("key"); // 获取查询参数中的 `key`

  if (!file_id) {
    return c.json({ success: false, message: "Key (file_id) is required" }, 400);
  }

  try {
    // 调用服务层获取元数据
    const metadata = await metadataService.getMetadata(file_id, c);

    if (!metadata) {
      return c.json({ success: false, message: `Metadata not found for key: ${file_id}` }, 404);
    }

    return c.json({ success: true, metadata }, 200);
  } catch (error) {
    console.error(`Error fetching metadata for key ${file_id}:`, error);
    return c.json({ success: false, message: "Failed to fetch metadata" }, 500);
  }
};

/**
 * 调试元数据
 */
export const debugMetadata = async (c: Context) => {
  try {
    // 调用服务层获取所有元数据
    const storedMetadata = await metadataService.debugMetadata(c);

    return c.json({ success: true, data: storedMetadata }, 200);
  } catch (error) {
    console.error("Error debugging metadata:", error);
    return c.json({ success: false, message: "Failed to debug metadata" }, 500);
  }
};

/**
 * 删除所有元数据
 */
export const removeAllMetadata = async (c: Context) => {
  try {
    // 调用服务层清除所有元数据
    await metadataService.removeAllMetadata(c);

    return c.json({ success: true, message: "All metadata removed successfully" }, 200);
  } catch (error) {
    console.error("Error removing all metadata:", error);
    return c.json({ success: false, message: "Failed to remove all metadata" }, 500);
  }
};

