import { Context } from "hono";
import { MultipartUploadService } from "../../../services/multipartUploadService";
import { formatSuccess, formatError } from "../../../utils/response";

export async function MultipartComplete(c: Context) {
  const body = await c.req.json();
  const { object_key, upload_id, parts } = body;

  // 参数验证
  if (!object_key || !upload_id || !parts || !Array.isArray(parts)) {
    return c.json(formatError("参数缺失，请提供 object_key, upload_id 和 parts"), 400);
  }

  try {
    // 完成分片上传
    const result = await MultipartUploadService.completeMultipartUpload(
      c.env,
      object_key,
      upload_id,
      parts
    );

    return c.json(formatSuccess(result, "分片上传已完成"));
  } catch (error) {
    console.error("Multipart Complete Error:", error);
    return c.json(formatError(error.message || "服务器内部错误"), 500);
  }
}
