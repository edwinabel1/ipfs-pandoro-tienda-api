import { Context } from "hono";
import { DB } from "../../utils/database";
import { SiteSessionService } from "../../services/siteSessionService";
import { formatSuccess, formatError } from "../../utils/response";

export async function CodeRedeem(c: Context) {
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    return c.json(formatError("兑换码不能为空"), 400);
  }

  try {
    const db = DB.getInstance(c.env);

    // 验证兑换码
    const query = `SELECT * FROM codes WHERE code = ?`;
    const codeData = await db.prepare(query).bind(code).first();

    if (!codeData) {
      return c.json(formatError("兑换码无效"), 400);
    }

    if (codeData.is_active === 0) {
      return c.json(formatError("兑换码已失效"), 400);
    }

    if (codeData.expiration_date && new Date() > new Date(codeData.expiration_date)) {
      return c.json(formatError("兑换码已过期"), 400);
    }

    // 将兑换码标记为失效
    const updateQuery = `UPDATE codes SET is_active = 0 WHERE id = ?`;
    await db.prepare(updateQuery).bind(codeData.id).run();

    // 调用 createSiteSession 创建子站点
    const siteSession = await SiteSessionService.createSiteSession(c.env, codeData.quota);

    // 返回子站点信息
    return c.json(
      formatSuccess(
        {
          session_id: siteSession.session_id,
          quota_remaining: siteSession.quota_remaining,
        },
        "兑换成功，子站点已生成"
      )
    );
  } catch (error) {
    console.error("Code Redeem Error:", error);
    return c.json(formatError("服务器内部错误"), 500);
  }
}
