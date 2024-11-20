import { Context } from "hono";
import { SiteSessionService } from "../../services/siteSessionService";
import { formatSuccess, formatError } from "../../utils/response";

export async function UploadRequest(c: Context) {
  const body = await c.req.json();
  //console.log("Received body:", body);
  const { session_id, file_name, file_size, content_type, metadata } = body; // 接收 metadata

  // 参数验证
  if (!session_id || !file_name || !file_size || !content_type || !metadata) {
    return c.json(formatError("参数缺失，请提供 session_id, file_name, file_size, content_type 和 metadata"), 400);
  }

  // Metadata 验证
  if (!metadata.path || !metadata['replica-count']) {
    return c.json(formatError("metadata 中必须包含 path 和 replica-count"), 400);
  }

  try {
    // 调用服务层生成预签名 URL
    const result = await SiteSessionService.generateUploadUrl(
      c,
      session_id,
      file_name,
      file_size,
	  content_type,
      metadata // 将 metadata 传递给服务层
    );

    return c.json(formatSuccess(result, "预签名上传 URL 已生成"));
  } catch (error) {
    console.error("Upload Request Error:", error);
    return c.json(formatError(error.message || "服务器内部错误"), 500);
  }
}
