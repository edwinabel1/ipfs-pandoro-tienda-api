import { DB } from "../utils/database";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class SiteSessionService {
  // 验证会话和剩余额度
  static async validateQuota(env: any, session_id: string, file_size: number) {
	const db = DB.getInstance(env);

	if (!db) {
	  throw new Error("Database instance is not initialized");
	}

    // 查询剩余额度
    const query = `SELECT quota_remaining FROM site_sessions WHERE session_id = ?`;
    const session = await db.prepare(query).bind(session_id).first();

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.quota_remaining < file_size) {
      throw new Error("Insufficient quota");
    }

    // 扣减配额
    const updateQuery = `
      UPDATE site_sessions
      SET quota_remaining = quota_remaining - ?
      WHERE session_id = ? AND quota_remaining >= ?
    `;
    const updateResult = await db.prepare(updateQuery).bind(file_size, session_id, file_size).run();

    if (updateResult.changes === 0) {
      throw new Error("Quota update failed");
    }
  }

	  // 生成普通上传的预签名 URL
static async generateUploadUrl(env: any, session_id: string, file_name: string, file_size: number) {
  // 检查 R2 环境变量是否正确
  if (!env.R2_BUCKET || !env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 configuration is missing in environment variables");
  }

  // 初始化 S3 客户端
  const s3Client = new S3Client({
    endpoint: env.R2_ENDPOINT,
    region: 'auto', // Cloudflare R2 使用 'auto' 作为区域
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const db = DB.getInstance(env);
  if (!db) {
    throw new Error("Database instance is not initialized");
  }

  // 验证会话和剩余额度
  const query = `SELECT quota_remaining FROM site_sessions WHERE session_id = ?`;
  const session = await db.prepare(query).bind(session_id).first();

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.quota_remaining < file_size) {
    throw new Error("Insufficient quota");
  }

  // 扣减配额
  const updateQuery = `
    UPDATE site_sessions
    SET quota_remaining = quota_remaining - ?
    WHERE session_id = ? AND quota_remaining >= ?
  `;
  const updateResult = await db.prepare(updateQuery).bind(file_size, session_id, file_size).run();

  if (updateResult.changes === 0) {
    throw new Error("Quota update failed");
  }

  // 生成预签名 URL
  const objectKey = `${session_id}/${file_name}`;
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: objectKey,
    ContentLength: file_size,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // URL 有效期 15 分钟

  return {
    upload_url: signedUrl,
    object_key: objectKey,
  };
}
  
  // 创建子站点会话
  static async createSiteSession(env: any, quota: number) {
    const db = DB.getInstance(env);
    const sessionId = crypto.randomUUID(); // 使用 crypto 生成唯一 ID

    const insertQuery = `
      INSERT INTO site_sessions (session_id, quota_remaining)
      VALUES (?, ?)
    `;

    try {
      await db.prepare(insertQuery).bind(sessionId, quota).run();
      return { success: true, session_id: sessionId, quota_remaining: quota };
    } catch (error) {
      console.error("Site Session Creation Error:", error);
      throw new Error("Failed to create site session");
    }
  }

  // 更新剩余额度
  static async updateQuota(env: any, session_id: string, file_size: number) {
    const db = DB.getInstance(env);

    try {
      // 开始事务
      await db.prepare(`BEGIN TRANSACTION;`).run();

      // 查询剩余额度
      const query = `SELECT quota_remaining FROM site_sessions WHERE session_id = ?`;
      const session = await db.prepare(query).bind(session_id).first();

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.quota_remaining < file_size) {
        throw new Error("Insufficient quota");
      }

      // 更新剩余额度
      const updateQuery = `
        UPDATE site_sessions
        SET quota_remaining = quota_remaining - ?
        WHERE session_id = ? AND quota_remaining >= ?
      `;
      const result = await db.prepare(updateQuery).bind(file_size, session_id, file_size).run();

      if (result.changes === 0) {
        throw new Error("Quota update failed");
      }

      // 提交事务
      await db.prepare(`COMMIT;`).run();

      return { success: true, quota_remaining: session.quota_remaining - file_size };
    } catch (error) {
      // 回滚事务
      await db.prepare(`ROLLBACK;`).run();
      console.error("Quota Update Error:", error);
      return { success: false, message: error.message };
    }
  }
}
