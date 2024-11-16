import { Context } from "hono";
import { MultipartUploadService } from "../../../services/multipartUploadService";
import { SiteSessionService } from "../../../services/siteSessionService";
import { formatSuccess, formatError } from "../../../utils/response";

export async function MultipartInit(c: Context) {
  const body = await c.req.json();
  const { session_id, file_name, file_size } = body;

  // 参数验证
  if (!session_id || !file_name || !file_size) {
    return c.json(formatError("参数缺失，请提供 session_id, file_name 和 file_size"), 400);
  }

  try {
    // 验证会话和配额
    await SiteSessionService.validateQuota(c.env, session_id, file_size);

    // 初始化分片上传
    const result = await MultipartUploadService.initializeMultipartUpload(
      c.env,
      session_id,
      file_name
    );

    return c.json(formatSuccess(result, "分片上传已初始化"));
  } catch (error) {
    console.error("Multipart Init Error:", error);
    return c.json(formatError(error.message || "服务器内部错误"), 500);
  }
}
