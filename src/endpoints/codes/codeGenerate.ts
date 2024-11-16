import { Context } from "hono";
import { CodeService } from "../../services/codeService";
import { formatSuccess, formatError } from "../../utils/response";

export async function CodeGenerate(c: Context) {
  const body = await c.req.json();
  const { quota, count = 1, expiration_date, batch_id, remarks } = body;

  if (!quota || quota <= 0) {
    return c.json(formatError("存储额度必须大于 0"), 400);
  }

  try {
    // 调用服务生成兑换码
    const codes = await CodeService.generateCodes({
	  env: c.env,
      quota,
      count,
      expiration_date,
      batch_id,
      remarks,
    });

    return c.json(formatSuccess({ codes }));
  } catch (error) {
    console.error("Code Generation Error:", error);
    return c.json(formatError("服务器内部错误"), 500);
  }
}
