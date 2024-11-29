import orderService from "../../services/orderService";

export const completeOrder = {
  handler: async (c) => {
    try {
      const { order_id, final_cid, node_id } = await c.req.json();

      if (!order_id || !final_cid || !node_id) {
        return c.json({ success: false, message: "Order ID, final CID, and node ID are required" }, 400);
      }

      // 调用服务层的 completeOrder 并获取返回结果
      const result = await orderService.completeOrder(order_id, final_cid, node_id, c);

      // 返回完整的结果，包含 completedNodesCount
      return c.json({
        success: true,
        message: result.message,
        completedNodesCount: result.completedNodesCount,
      }, 200);
    } catch (error) {
      console.error("Error in completeOrder:", error.message);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Complete Order",
    description: "Mark an order as completed by submitting its final CID and node ID.",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              order_id: { type: "string", description: "Unique identifier for the order" },
              final_cid: { type: "string", description: "The final CID of the merged directory" },
              node_id: { type: "string", description: "The ID of the node processing the order" },
            },
            required: ["order_id", "final_cid", "node_id"],
          },
        },
      },
    },
    responses: {
      200: {
        description: "Order completed successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                completedNodesCount: { type: "number", description: "The number of nodes that have completed this order" },
              },
            },
          },
        },
      },
      400: { description: "Invalid request data" },
      500: { description: "Internal Server Error" },
    },
  },
};

export const getAndLockMergeReadyOrder = {
  handler: async (c) => {
    try {
      const node_id = c.req.header("x-node-id");
      if (!node_id) {
        return c.json({ success: false, message: "Node ID is required in the request headers." }, 400);
      }
	  
      const result = await orderService.getAndLockMergeReadyOrder(node_id, c);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error fetching and locking mergeReady order:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Get and Lock Merge Ready Order",
    description: "Retrieve the first mergeReady order and lock it for the requesting node.",
    parameters: {
      headers: {
        "x-node-id": { type: "string", description: "The ID of the requesting node" },
      },
    },
    responses: {
      200: { description: "Order retrieved and locked successfully" },
      400: { description: "Invalid node ID." },
      500: { description: "Internal Server Error" },
    },
  },
};

export const removeAllOrders = {
  handler: async (c: any) => {
    try {
      const result = await orderService.removeAllOrders(c);
      return c.json(result, 200);
    } catch (error) {
      console.error("Error removing all orders:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Remove All Orders",
    description: "Deletes all stored orders.",
    responses: {
      200: {
        description: "All orders removed successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      500: {
        description: "Failed to remove all orders",
      },
    },
  },
};

// 创建订单
export const createOrder = {
  handler: async (c: any) => {
    const { order_id, type, files } = await c.req.json();

    try {
      const result = await orderService.createOrder({ order_id, type, files }, c);
      return c.json({ success: true, message: "Order created successfully", ...result }, 201);
    } catch (error) {
      return c.json({ success: false, message: error.message }, 400);
    }
  },
  schema: {
    summary: "Create Order",
    description: "Create a new order with files and type.",
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              order_id: { type: "string", description: "Unique identifier for the order" },
              type: { type: "string", enum: ["file", "directory"], description: "Type of the order" },
              files: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    uuid: { type: "string", description: "Unique identifier for the file" },
                    path: { type: "string", description: "Path of the file in the directory" },
                  },
                },
              },
            },
            required: ["order_id", "type", "files"],
          },
        },
      },
    },
    responses: {
      201: {
        description: "Order created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                order_id: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid order data.",
      },
    },
  },
};

// 查询订单状态
export const getOrderStatus = {
  handler: async (c: any) => {
	const url = new URL(c.req.url);
	const order_id = url.searchParams.get("order_id");

    try {
      const result = await orderService.getOrderStatus(order_id, c);
      return c.json({ success: true, ...result }, 200);
    } catch (error) {
      return c.json({ success: false, message: error.message }, 404);
    }
  },
  schema: {
    summary: "Get Order Status",
    description: "Retrieve the status and details of an order by its ID.",
    parameters: {
      path: {
        order_id: { type: "string", description: "The ID of the order" },
      },
    },
    responses: {
      200: {
        description: "Order status retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                id: { type: "string" },
                type: { type: "string" },
                status: { type: "string" },
                files: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      uuid: { type: "string" },
                      path: { type: "string" },
                    },
                  },
                },
                result: { type: "string" },
              },
            },
          },
        },
      },
      404: {
        description: "Order not found.",
      },
    },
  },
};

// 更新订单状态
export const updateOrder = {
  handler: async (c: any) => {
    const { order_id, status, result } = await c.req.json();

    try {
      await orderService.updateOrder(order_id, { status, result }, c);
      return c.json({ success: true, message: "Order updated successfully" }, 200);
    } catch (error) {
      return c.json({ success: false, message: error.message }, 400);
    }
  },
  schema: {
    summary: "Update Order Status",
    description: "Update the status and result of an order.",
    parameters: {
      path: {
        order_id: { type: "string", description: "The ID of the order" },
      },
    },
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              status: { type: "string", description: "The updated status of the order" },
              result: { type: "string", description: "The CID or other result of the order" },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "Order updated successfully.",
      },
      400: {
        description: "Invalid request.",
      },
    },
  },
};

// 调试订单数据
export const debugOrders = {
  handler: async (c: any) => {
    try {
      const result = await orderService.debugOrders(c);
      return c.json({ success: true, ...result }, 200);
    } catch (error) {
      return c.json({ success: false, message: error.message }, 500);
    }
  },
  schema: {
    summary: "Debug Orders",
    description: "Retrieve all stored order data for debugging purposes.",
    responses: {
      200: {
        description: "Orders retrieved successfully.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                orders: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      order_id: { type: "string" },
                      type: { type: "string" },
                      status: { type: "string" },
                      files: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            uuid: { type: "string" },
                            path: { type: "string" },
                          },
                        },
                      },
                      result: { type: "string" },
                      createdAt: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      500: {
        description: "Internal Server Error.",
      },
    },
  },
};

