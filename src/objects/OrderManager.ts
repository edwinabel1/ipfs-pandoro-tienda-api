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

    if (
      method === "POST" &&
      url.pathname === "/ordermanager/add-file-mapping"
    ) {
      return await this.addFileMapping(request);
    }

    if (method === "GET" && url.pathname === "/ordermanager/merge-ready") {
      return await this.getAndLockMergeReadyOrder(request);
    }

    if (method === "POST" && url.pathname === "/ordermanager/complete") {
      return await this.completeOrder(request);
    }

    return new Response("Not Found", { status: 404 });
  }

async completeOrder(request) {
  try {
    const { order_id, final_cid, node_id } = await request.json();

    if (!order_id || !final_cid || !node_id) {
      return new Response("Order ID, final CID, and Node ID are required", { status: 400 });
    }

    const order = await this.state.storage.get(order_id);
    if (!order) {
      return new Response("Order not found", { status: 404 });
    }

    if (order.status !== "mergeReady") {
      return new Response("Order is not in mergeReady state", { status: 400 });
    }

    // 初始化 completedNodes 数组并确保去重
    order.completedNodes = Array.from(new Set([...(order.completedNodes || []), node_id]));

    // 更新订单状态和结果
    order.final_cid = final_cid;
    await this.state.storage.put(order_id, order);

    // 返回结果包含 completedNodes 数量
    return new Response(
      JSON.stringify({
        success: true,
        message: "Order completed successfully",
        completedNodesCount: order.completedNodes.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error completing order:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}


  // 获取第一个 mergeReady 订单
async getAndLockMergeReadyOrder(request) {
  try {
    const url = new URL(request.url);
    const node_id = url.searchParams.get("node_id");
    if (!node_id) {
      return new Response("Node ID is required", { status: 400 });
    }

    const storedEntries = await this.state.storage.list();

    for (const [order_id, order] of storedEntries) {
      if (
        order.status === "mergeReady" &&
        (!order.completedNodes || !order.completedNodes.includes(node_id))
      ) {
        // 更新状态为 merging
        //order.status = "merging";
        await this.state.storage.put(order_id, order);

        return new Response(
          JSON.stringify({ success: true, order: { order_id, result: order.result } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ success: true, order: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching mergeReady order:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to fetch mergeReady order" }),
      { status: 500 }
    );
  }
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
        const finalJson = await this.generateFinalJson(order.fileCidMap, request);
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

async getMetadataInternal(key, request) {
  const baseUrl = new URL(request.url).origin;
  const metadataUrl = new URL(`/api/metadata/get?key=${encodeURIComponent(key)}`, baseUrl);

  console.log("Fetching metadata from:", metadataUrl.toString()); // 调试日志

  const response = await fetch(metadataUrl.toString(), { method: "GET" });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to fetch metadata for key ${key}:`, error);
    throw new Error(`Failed to fetch metadata: ${error}`);
  }

  const responseData = await response.json();

  // 验证返回的 success 字段
  if (!responseData.success) {
    console.warn(`Metadata request failed for key ${key}:`, responseData);
    throw new Error(`Metadata request failed for key: ${key}`);
  }

  const metadata = responseData.metadata;

  // 验证返回的 metadata 是否符合预期
  if (!metadata || typeof metadata !== "object" || !metadata.path) {
    console.warn(`Invalid metadata response for key ${key}:`, metadata);
    throw new Error(`Invalid metadata for key: ${key}`);
  }

  console.log(`Successfully fetched metadata for key ${key}:`, metadata);
  return metadata; // 确保返回完整有效的 metadata 对象
}

async generateFinalJson(fileCidMap, request) {
  const root = {};

  for (const [file_id, { cid, size }] of Object.entries(fileCidMap)) {
    console.log(`Processing file_id: ${file_id}`); // 调试日志

    try {
      const metadata = await this.getMetadataInternal(file_id, request);

      // 验证 metadata 的 path 字段
      if (!metadata || !metadata.path) {
        console.warn(`Missing metadata or path for file_id: ${file_id}`);
        continue;
      }

      const parts = metadata.path.split("/").filter(Boolean); // 确保路径分割后不包含空值
      if (parts.length === 0) {
        console.warn(`Invalid path for file_id: ${file_id}, path: ${metadata.path}`);
        continue;
      }

      let current = root;

      // 构建目录树
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
      }

      const fileName = parts[parts.length - 1];

      // 验证 CID 和文件大小是否有效
      if (!cid || !size) {
        console.warn(`Invalid CID or size for file_id: ${file_id}, skipping...`);
        continue;
      }

      // 将文件信息添加到目录树
      current[fileName] = { cid, size };
    } catch (error) {
      console.error(`Error processing file_id ${file_id}:`, error);
      continue;
    }
  }

  console.log("Final directory structure:", JSON.stringify(root, null, 2)); // 调试输出
  return this.convertToDagPbWithPlaceholders(root);
}

  // 转换为 DAG-PB JSON 的占位符方法
convertToDagPbWithPlaceholders(node) {
  const convertNode = (node) => {
    const links = [];

    for (const [name, value] of Object.entries(node)) {
      if (value.cid && value.size) {
        // 这是一个文件
        links.push({
          Name: name,
          Hash: { "/": value.cid },
          Tsize: value.size,
        });
      } else if (typeof value === "object") {
        // 这是一个目录，递归处理
        const childNode = convertNode(value);
        links.push({
          Name: name,
          Hash: { "/": null }, // 占位符，因为我们还没有目录的 CID
          Tsize: 0,
          Node: childNode, // 包含子目录的节点
        });
      } else {
        // 未知的项，使用占位符
        links.push({
          Name: name,
          Hash: { "/": null },
          Tsize: 0,
        });
      }
    }

    return { Data: "", Links: links };
  };

  return convertNode(node);
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
        JSON.stringify({
          success: true,
          message: "All orders removed successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error removing all orders:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to remove all orders",
        }),
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

  async updateOrder(request) {
    try {
      const { order_id, status, result } = await request.json();

      if (!order_id || !status) {
        return new Response("Order ID and status are required", {
          status: 400,
        });
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
}
