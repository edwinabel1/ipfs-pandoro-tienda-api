import { Hono } from "hono";
import orderService from "../../services/orderService";
import metadataService from "../../services/metadataService";

// 添加 R2 键到 CID 的映射
export const addMapping = {
  handler: async (c: any) => {
    try {
      const { key: file_id, cid, size } = await c.req.json();

      if (!file_id || !cid || !size) {
        return c.json({ success: false, message: "File ID, CID, and file size are required" }, 400);
      }

      // 查询 file_id 对应的 order_id
      const order_id = await metadataService.getOrderIdByFileId(file_id, c);
      if (!order_id) {
        return c.json({ success: false, message: `Order ID not found for file ID: ${file_id}` }, 404);
      }

      // 调用服务层，传递 size 参数
      await orderService.addFileMapping(order_id, file_id, cid, size, c);

      return c.json({ success: true, message: "Mapping added successfully" }, 201);
    } catch (error) {
      console.error("Error adding mapping:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Add R2 Key to CID Mapping",
    description: "Add a mapping from an R2 file key to an IPFS CID.",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              key: { type: "string", description: "R2 file key" },
              cid: { type: "string", description: "IPFS CID" },
              size: { type: "integer", description: "Size of the file in bytes" },
            },
            required: ["key", "cid", "size"],
          },
        },
      },
    },
    responses: {
      201: { description: "Mapping added successfully" },
      400: { description: "Invalid input" },
      500: { description: "Internal Server Error" },
    },
  },
};

// 查询 R2 键到 CID 的映射
export const getMapping = {
  handler: async (c: any) => {
    try {
      const file_id = c.req.query("key");

      if (!file_id) {
        return c.json({ success: false, message: "File ID is required" }, 400);
      }

      // 查询 file_id 对应的 order_id
      const order_id = await metadataService.getOrderIdByFileId(file_id, c);
      if (!order_id) {
        return c.json({ success: false, message: `Order ID not found for file ID: ${file_id}` }, 404);
      }

      // 从订单中获取映射
      const mapping = await orderService.getFileMapping(order_id, file_id, c);

      if (!mapping) {
        return c.json({ success: false, message: "Mapping not found" }, 404);
      }

      // 返回数据
      return c.json({ success: true, data: mapping }, 200);
    } catch (error) {
      console.error("Error getting mapping:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Get R2 Key to CID Mapping",
    description: "Retrieve the CID and file size for a given R2 file key.",
    parameters: {
      query: {
        key: { type: "string", description: "R2 file key (file_id)", required: true },
      },
    },
    responses: {
      200: {
        description: "Mapping retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                key: { type: "string" },
                cid: { type: "string" },
                size: { type: "integer" },
              },
            },
          },
        },
      },
      400: { description: "Key is required" },
      404: { description: "Mapping not found" },
      500: { description: "Internal Server Error" },
    },
  },
};

// 删除 R2 键到 CID 的映射
export const deleteMapping = {
  handler: async (c: any) => {
    try {
      const { key: file_id } = await c.req.json();

      if (!file_id) {
        return c.json({ success: false, message: "File ID is required" }, 400);
      }

      // 查询 file_id 对应的 order_id
      const order_id = await metadataService.getOrderIdByFileId(file_id, c);
      if (!order_id) {
        return c.json({ success: false, message: `Order ID not found for file ID: ${file_id}` }, 404);
      }

      // 删除文件映射
      await orderService.deleteFileMapping(order_id, file_id, c);

      return c.json({ success: true, message: "Mapping deleted successfully" }, 200);
    } catch (error) {
      console.error("Error deleting mapping:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Delete R2 Key to CID Mapping",
    description: "Delete a mapping from an R2 file key to an IPFS CID.",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              key: { type: "string", description: "R2 file key (file_id)" },
            },
            required: ["key"],
          },
        },
      },
    },
    responses: {
      200: { description: "Mapping deleted successfully" },
      400: { description: "Key is required" },
      500: { description: "Internal Server Error" },
    },
  },
};

// 添加 R2 键到 CID 的调试功能
export const debugMapping = {
  handler: async (c: any) => {
    try {
      const storage = c.env.STORAGE;

      const keys = await storage.list(); // 获取所有 file_id
      const stored = {};
      for (const file_id of keys) {
        // 查询每个 file_id 的元数据和订单映射
        const order_id = await metadataService.getOrderIdByFileId(file_id, c);
        if (order_id) {
          const mapping = await orderService.getFileMapping(order_id, file_id, c);
          stored[file_id] = mapping;
        }
      }

      return c.json({ success: true, data: stored }, 200);
    } catch (error) {
      console.error("Error debugging mappings:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Debug R2 Key to CID Mappings",
    description: "Retrieve all stored R2 to CID mappings for debugging purposes, including file sizes.",
    responses: {
      200: {
        description: "Mappings retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                stored: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      cid: { type: "string" },
                      size: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      500: { description: "Internal Server Error" },
    },
  },
};
