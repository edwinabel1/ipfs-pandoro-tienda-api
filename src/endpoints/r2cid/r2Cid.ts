import { Hono } from "hono";
import r2CidService from "../../services/r2CidService";

// 添加 R2 键到 CID 的映射
export const addMapping = {
  handler: async (c: any) => {
    try {
      const { key, cid } = await c.req.json();

      if (!key || !cid) {
        return c.json({ success: false, message: "Key and CID are required" }, 400);
      }

      await r2CidService.addMapping(key, cid, c);

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
            },
            required: ["key", "cid"],
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
      const key = c.req.query("key");

      if (!key) {
        return c.json({ success: false, message: "Key is required" }, 400);
      }

      const data = await r2CidService.getMapping(key, c);

      return c.json({ success: true, data }, 200);
    } catch (error) {
      console.error("Error getting mapping:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Get R2 Key to CID Mapping",
    description: "Retrieve the CID for a given R2 file key.",
    parameters: {
      query: {
        key: { type: "string", description: "R2 file key", required: true },
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
      const { key } = await c.req.json();

      if (!key) {
        return c.json({ success: false, message: "Key is required" }, 400);
      }

      await r2CidService.deleteMapping(key, c);

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
              key: { type: "string", description: "R2 file key" },
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
      const data = await r2CidService.debugMapping(c);

      return c.json({ success: true, data }, 200);
    } catch (error) {
      console.error("Error debugging mappings:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Debug R2 Key to CID Mappings",
    description: "Retrieve all stored R2 to CID mappings for debugging purposes.",
    responses: {
      200: {
        description: "Mappings retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                stored: { type: "object" },
              },
            },
          },
        },
      },
      500: { description: "Internal Server Error" },
    },
  },
};

