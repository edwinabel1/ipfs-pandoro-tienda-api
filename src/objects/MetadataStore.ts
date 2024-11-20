export class MetadataStore {
  constructor(state) {
    this.state = state; // Durable Object 的持久化存储
  }
  
  async storeMetadata(request) {
    try {
      const { key, metadata } = await request.json();
      console.log('Received key:', key, 'Received metadata:', metadata);

      // 直接写入持久化存储
      await this.state.storage.put(key, metadata);

      return new Response("Metadata stored successfully", { status: 200 });
    } catch (error) {
      console.error("Error storing metadata:", error);
      return new Response("Failed to store metadata", { status: 500 });
    }
  }

  async getMetadata(request) {
    try {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      const metadata = await this.state.storage.get(key);

      if (!metadata) {
        return new Response("Metadata not found", { status: 404 });
      }

      return new Response(JSON.stringify(metadata), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error retrieving metadata:", error);
      return new Response("Failed to retrieve metadata", { status: 500 });
    }
  }

  async deleteMetadata(request) {
    try {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");

      await this.state.storage.delete(key);

      return new Response("Metadata deleted", { status: 200 });
    } catch (error) {
      console.error("Error deleting metadata:", error);
      return new Response("Failed to delete metadata", { status: 500 });
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

  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/filemeta/store") {
      return await this.storeMetadata(request);
    } else if (pathname === "/filemeta/get") {
      return await this.getMetadata(request);
    } else if (pathname === "/filemeta/delete") {
      return await this.deleteMetadata(request);
    } else if (pathname === "/filemeta/debug") {
      return await this.debugMetadata();
    }

    return new Response("Not Found", { status: 404 });
  }
}
