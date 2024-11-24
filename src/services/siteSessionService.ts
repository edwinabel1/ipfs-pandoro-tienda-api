import { DB } from "../utils/database";
import { generateUUID } from "../utils/random";
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
    const updateResult = await db
      .prepare(updateQuery)
      .bind(file_size, session_id, file_size)
      .run();

    if (updateResult.changes === 0) {
      throw new Error("Quota update failed");
    }
  }

// 生成上传 URL
static async generateUploadUrl(
  c,
  session_id,
  file_name,
  file_size,
  content_type,
  metadata
) {
  const env = c.env;

  // 验证配额
  await this.validateQuota(env, session_id, file_size);

  const S3 = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  // 生成随机文件名和路径
  const randomFileName = generateUUID();
  const randomPathName = `pending_files/${randomFileName}`;

  try {
    // 提取元数据
    const fileMetadata = {
      path: metadata.path,
      "replica-count": metadata["replica-count"],
      order_id: metadata.order_id,
    };

    // 配置上传命令
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: randomPathName,
      ContentType: content_type,
      ContentLength: file_size,
      Metadata: fileMetadata,
    });

    // 生成预签名 URL
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 900 });

    // 获取 Durable Object 实例
    const metadataStoreId = env.METADATA_STORE.idFromName("metadata-store");
    const metadataStore = env.METADATA_STORE.get(metadataStoreId);

    // 生成全路径调用 URL
    const durableObjectUrl = new URL("/filemeta/store", c.req.url).toString();

    // 准备元数据负载
    const metadataPayload = {
      key: randomPathName,
      metadata: fileMetadata, // 复用提取的元数据
    };

    // 发送请求到 Durable Object
    const response = await metadataStore.fetch(durableObjectUrl, {
      method: "POST",
      body: JSON.stringify(metadataPayload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 检查响应
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to store metadata: ${errorText}`);
    }

    return {
      upload_url: signedUrl,
      object_key: randomPathName,
    };
  } catch (error) {
    console.error(
      "Error generating signed URL or storing metadata:",
      error
    );
    throw new Error("Failed to generate signed URL or store metadata");
  }
}


  // 创建子站点会话
  static async createSiteSession(env: any, quota: number) {
    const db = DB.getInstance(env);
    const sessionId = generateUUID(); // 使用 generateUUID 替代 crypto.randomUUID

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
      const result = await db
        .prepare(updateQuery)
        .bind(file_size, session_id, file_size)
        .run();

      if (result.changes === 0) {
        throw new Error("Quota update failed");
      }

      // 提交事务
      await db.prepare(`COMMIT;`).run();

      return {
        success: true,
        quota_remaining: session.quota_remaining - file_size,
      };
    } catch (error) {
      // 回滚事务
      await db.prepare(`ROLLBACK;`).run();
      console.error("Quota Update Error:", error);
      throw new Error("Failed to update quota");
    }
  }
}
