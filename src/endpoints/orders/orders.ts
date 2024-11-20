import orderService from "../../services/orderService";

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
    const { order_id } = c.req.param();

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
    const { order_id } = c.req.param();
    const { status, result } = await c.req.json();

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
