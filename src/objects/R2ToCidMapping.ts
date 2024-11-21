export class R2ToCidMapping {
  constructor(state) {
    this.state = state; // Durable Object 的持久化存储
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "POST" && url.pathname === "/r2tocidmapping/add") {
      return await this.addMapping(request);
    }

    if (method === "GET" && url.pathname.startsWith("/r2tocidmapping/get")) {
      return await this.getMapping(request);
    }

    if (method === "DELETE" && url.pathname === "/r2tocidmapping/delete") {
      return await this.deleteMapping(request);
    }
	
	if (method === "GET" && url.pathname === "/r2tocidmapping/debug") {
      return await this.debugMetadata();
    }

    return new Response("Not Found", { status: 404 });
  }

  // 添加映射
  async addMapping(request) {
    try {
      const { key, cid } = await request.json();

      if (!key || !cid) {
        return new Response("Key and CID are required", { status: 400 });
      }

      await this.state.storage.put(key, cid);

      return new Response("Mapping added successfully", { status: 201 });
    } catch (error) {
      console.error("Error adding mapping:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 获取映射
  async getMapping(request) {
    try {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");

      if (!key) {
        return new Response("Key is required", { status: 400 });
      }

      const cid = await this.state.storage.get(key);

      if (!cid) {
        return new Response("Mapping not found", { status: 404 });
      }

      return new Response(JSON.stringify({ key, cid }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error getting mapping:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 删除映射
  async deleteMapping(request) {
    try {
      const { key } = await request.json();

      if (!key) {
        return new Response("Key is required", { status: 400 });
      }

      await this.state.storage.delete(key);

      return new Response("Mapping deleted successfully", { status: 200 });
    } catch (error) {
      console.error("Error deleting mapping:", error);
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
