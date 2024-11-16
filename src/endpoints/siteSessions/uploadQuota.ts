import { Context } from "hono";
import { SiteSessionService } from "../../services/siteSessionService";
import { formatSuccess, formatError } from "../../utils/response";

export async function UploadQuota(c: Context) {
  const body = await c.req.json();
  const { session_id, file_size } = body;

  if (!session_id || !file_size) {
    return c.json(formatError("参数缺失"), 400);
  }

  try {
    const result = await SiteSessionService.updateQuota(c.env, session_id, file_size);

    if (!result.success) {
      return c.json(formatError(result.message), 400);
    }

    return c.json(formatSuccess(result, "配额更新成功"));
  } catch (error) {
    console.error("Upload Quota Error:", error);
    return c.json(formatError("服务器内部错误"), 500);
  }
}
