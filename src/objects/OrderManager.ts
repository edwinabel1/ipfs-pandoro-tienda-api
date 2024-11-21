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
	
	if (method === "GET" && url.pathname === "/ordermanager/debug") {
      return await this.debugMetadata();
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

      const orderData = {
        order_id,
        type,
        files,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // 存储订单数据
      await this.state.storage.put(order_id, orderData);

      return new Response("Order created successfully", { status: 201 });
    } catch (error) {
      console.error("Error creating order:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
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

  // 更新订单状态
  async updateOrder(request) {
    try {
      const { order_id, status, result } = await request.json();

      if (!order_id || !status) {
        return new Response("Order ID and status are required", { status: 400 });
      }

      const order = await this.state.storage.get(order_id);

      if (!order) {
        return new Response("Order not found", { status: 404 });
      }

      order.status = status;

      if (result) {
        order.result = result;
      }

      await this.state.storage.put(order_id, order);

      return new Response("Order updated successfully", { status: 200 });
    } catch (error) {
      console.error("Error updating order:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  
	async debugMetadata() {
	  try {
		// 获取存储的键值对 Map
		const storedEntries = await this.state.storage.list();

		// 将 Map 转换为普通对象
		const storedObject = Object.fromEntries(storedEntries);

		return new Response(
		  JSON.stringify({ stored: storedObject }),
		  { status: 200, headers: { "Content-Type": "application/json" }
		  }
		);
	  } catch (error) {
		console.error("Error retrieving debug information:", error);
		return new Response("Failed to retrieve debug information", { status: 500 });
	  }
	}

}
