export default {
  async addMapping(key, cid, c) {
	const env = c.env;
    if (!key || !cid) {
      throw new Error("Key and CID are required");
    }

    const durableObjectId = env.R2_TO_CID_MAPPING.idFromName(key);
    const durableObjectStub = env.R2_TO_CID_MAPPING.get(durableObjectId);

	const durableObjectUrl = new URL("/r2tocidmapping/add", c.req.url).toString();
    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, cid }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add mapping: ${error}`);
    }
  },

  async getMapping(key, c) {
	const env = c.env;
    if (!key) {
      throw new Error("Key is required");
    }

    const durableObjectId = env.R2_TO_CID_MAPPING.idFromName(key);
    const durableObjectStub = env.R2_TO_CID_MAPPING.get(durableObjectId);

	const durableObjectUrl = new URL(`/r2tocidmapping/get?key=${encodeURIComponent(key)}`, c.req.url).toString();
    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get mapping: ${error}`);
    }

    return await response.json();
  },

  async deleteMapping(key, c) {
	const env = c.env;
    if (!key) {
      throw new Error("Key is required");
    }

    const durableObjectId = env.R2_TO_CID_MAPPING.idFromName(key);
    const durableObjectStub = env.R2_TO_CID_MAPPING.get(durableObjectId);

	const durableObjectUrl = new URL("/r2tocidmapping/delete", c.req.url).toString();
    const response = await durableObjectStub.fetch(durableObjectUrl, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete mapping: ${error}`);
    }
  },
};
