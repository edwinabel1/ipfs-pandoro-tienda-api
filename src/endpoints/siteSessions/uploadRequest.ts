import { Context } from "hono";
import { SiteSessionService } from "../../services/siteSessionService";
import { formatSuccess, formatError } from "../../utils/response";

export async function UploadRequest(c: Context) {
  const body = await c.req.json();
  const { session_id, file_name, file_size } = body;

  // 参数验证
  if (!session_id || !file_name || !file_size) {
    return c.json(formatError("参数缺失，请提供 session_id, file_name 和 file_size"), 400);
  }

  try {
    // 调用服务层生成预签名 URL
    const result = await SiteSessionService.generateUploadUrl(
      c.env,
      session_id,
      file_name,
      file_size
    );

    return c.json(formatSuccess(result, "预签名上传 URL 已生成"));
  } catch (error) {
    console.error("Upload Request Error:", error);
    return c.json(formatError(error.message || "服务器内部错误"), 500);
  }
}
