import { Context } from "hono";
import { MultipartUploadService } from "../../../services/multipartUploadService";
import { formatSuccess, formatError } from "../../../utils/response";

export async function MultipartPart(c: Context) {
  const body = await c.req.json();
  const { object_key, upload_id, part_number } = body;

  // 参数验证
  if (!object_key || !upload_id || !part_number) {
    return c.json(formatError("参数缺失，请提供 object_key, upload_id 和 part_number"), 400);
  }

  try {
    // 生成预签名 URL
    const result = await MultipartUploadService.generatePartUploadUrl(
      c.env,
      object_key,
      upload_id,
      part_number
    );

    return c.json(formatSuccess(result, "分片预签名 URL 已生成"));
  } catch (error) {
    console.error("Multipart Part Error:", error);
    return c.json(formatError(error.message || "服务器内部错误"), 500);
  }
}
