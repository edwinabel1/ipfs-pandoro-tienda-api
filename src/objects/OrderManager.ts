export class OrderManager {
  constructor(state) {
    this.state = state; // Durable Object 的持久化存储
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "POST" && url.pathname === "/ordermanager/create") {
      return await this.createOrder(request);
    }

    if (method === "GET" && url.pathname === "/ordermanager/status") {
      return await this.getOrderStatus(request);
    }

    if (method === "PUT" && url.pathname === "/ordermanager/update") {
      return await this.updateOrder(request);
    }

    if (method === "POST" && url.pathname === "/ordermanager/remove-all") {
      return await this.removeAllOrders();
    }

    if (method === "GET" && url.pathname === "/ordermanager/debug") {
      return await this.debugOrders();
    }

    if (method === "POST" && url.pathname === "/ordermanager/add-file-mapping") {
      return await this.addFileMapping(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  // 创建订单
  async createOrder(request) {
    try {
      const { order_id, type, files } = await request.json();

      if (!order_id || !type || !files || files.length === 0) {
        return new Response("Invalid order data", { status: 400 });
      }

      const fileCidMap = {};
      files.forEach((file) => {
        fileCidMap[file.uuid] = { cid: null, size: null }; // 初始状态
      });

      const orderData = {
        order_id,
        type,
        fileCidMap,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await this.state.storage.put(order_id, orderData);

      return new Response("Order created successfully", { status: 201 });
    } catch (error) {
      console.error("Error creating order:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 添加文件到 CID 的映射
  async addFileMapping(request) {
    try {
      const { order_id, file_id, cid, size } = await request.json();

      const order = await this.state.storage.get(order_id);
      if (!order) {
        return new Response("Order not found", { status: 404 });
      }

      if (!order.fileCidMap[file_id]) {
        return new Response("File not found in order", { status: 404 });
      }

      // 更新 fileCidMap
      order.fileCidMap[file_id] = { cid, size: size }; // 统一为 size

      // 检查是否所有文件都完成 CID 映射
      const allFilesMapped = Object.values(order.fileCidMap).every(
        (file) => file.cid && file.size // 确保使用 size
      );

      if (allFilesMapped) {
        // 所有文件映射完成，生成 finalJson
        const finalJson = this.generateFinalJson(order.fileCidMap);
        order.status = "mergeReady";
        order.result = finalJson;
      }

      await this.state.storage.put(order_id, order);

      return new Response("File mapping added successfully", { status: 200 });
    } catch (error) {
      console.error("Error adding file mapping:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 生成最终 JSON
  generateFinalJson(fileCidMap) {
    return {
      Data: { "/": { bytes: "CAE" } },
      Links: Object.entries(fileCidMap).map(([file_id, { cid, size }]) => ({
        Hash: { "/": cid },
        Name: file_id,
        Tsize: size, // 统一为 size
      })),
    };
  }

  // 查询订单状态
  async getOrderStatus(request) {
    try {
      const url = new URL(request.url);
      const order_id = url.searchParams.get("order_id");

      if (!order_id) {
        return new Response("Order ID is required", { status: 400 });
      }

      const order = await this.state.storage.get(order_id);
      if (!order) {
        return new Response("Order not found", { status: 404 });
      }

      return new Response(JSON.stringify(order), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error fetching order status:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 删除所有订单
  async removeAllOrders() {
    try {
      const keys = await this.state.storage.list();
      for (const key of keys.keys()) {
        await this.state.storage.delete(key);
      }

      return new Response(
        JSON.stringify({ success: true, message: "All orders removed successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error removing all orders:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to remove all orders" }),
        { status: 500 }
      );
    }
  }

  // 调试订单数据
  async debugOrders() {
    try {
      const storedEntries = await this.state.storage.list();
      const storedObject = {};
      for (const [key, value] of storedEntries) {
        storedObject[key] = value;
      }

      return new Response(
        JSON.stringify({ success: true, orders: storedObject }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error debugging orders:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to debug orders" }),
        { status: 500 }
      );
    }
  }
}
