export default {
  /**
   * 创建订单
   * @param {Object} params - 订单参数
   * @param {string} params.order_id - 订单唯一标识
   * @param {string} params.type - 订单类型 ('file' or 'directory')
   * @param {Array<Object>} params.files - 文件数组
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<Object>} 返回创建成功的订单 ID
   */
  async createOrder({ order_id, type, files }, c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment.");
    }

    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);
    const durableObjectUrl = new URL("/ordermanager/create", c.req.url).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, type, files }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create order: ${error}`);
    }

    return { order_id };
  },

  /**
   * 查询订单状态
   * @param {string} order_id - 订单唯一标识
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<Object>} 返回订单状态数据
   */
  async getOrderStatus(order_id, c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment.");
    }

    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);
    const durableObjectUrl = new URL(
      `/ordermanager/status?order_id=${encodeURIComponent(order_id)}`,
      c.req.url
    ).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get order status: ${error}`);
    }

    return await response.json();
  },

  /**
   * 更新订单状态
   * @param {string} order_id - 订单唯一标识
   * @param {Object} params - 更新参数
   * @param {string} params.status - 更新的订单状态
   * @param {string} [params.result] - 更新的处理结果（可选）
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<void>}
   */
  async updateOrder(order_id, { status, result }, c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment.");
    }

    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);
    const durableObjectUrl = new URL("/ordermanager/update", c.req.url).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, status, result }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update order: ${error}`);
    }
  },

  /**
   * 添加文件的映射关系
   * @param {string} order_id - 订单唯一标识
   * @param {string} file_id - 文件唯一标识
   * @param {string} cid - 文件的 CID
   * @param {number} size - 文件的大小
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<void>}
   */
  async addFileMapping(order_id, file_id, cid, size, c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment.");
    }

    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);
    const durableObjectUrl = new URL("/ordermanager/add-file-mapping", c.req.url).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, file_id, cid, size }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add file mapping: ${error}`);
    }
  },

  /**
   * 调试订单数据
   * @param {Object} c - Hono 上下文对象
   * @returns {Promise<Object>} 返回所有订单数据
   */
  async debugOrders(c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment.");
    }

    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);
    const durableObjectUrl = new URL(`/ordermanager/debug`, c.req.url).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch orders: ${error}`);
    }

    return await response.json();
  },
  
  // 删除所有订单
  async removeAllOrders(c) {
    const env = c.env;

    if (!env.ORDER_MANAGER) {
      throw new Error("ORDER_MANAGER is not initialized in the environment");
    }

    // 使用固定的 Durable Object 实例
    const durableObjectId = env.ORDER_MANAGER.idFromName("main-instance");
    const durableObjectStub = env.ORDER_MANAGER.get(durableObjectId);

    // 调用 Durable Object 的 remove-all 路径
    const durableObjectUrl = new URL("/ordermanager/remove-all", c.req.url).toString();

    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to remove all orders: ${error}`);
    }

    return await response.json();
  },
};
