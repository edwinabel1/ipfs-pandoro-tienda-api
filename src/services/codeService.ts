import { generateRandomBytes } from "../utils/random";
import { DB } from "../utils/database";

export class CodeService {
  // 生成兑换码的逻辑
  static async generateCodes({
    env,
    quota,
    count,
    expiration_date,
    batch_id,
    remarks,
  }: {
    env: any; // 环境变量，包含 D1 数据库绑定
    quota: number;
    count: number;
    expiration_date?: string;
    batch_id?: string;
    remarks?: string;
  }) {
    const db = DB.getInstance(env); // 从 env 获取 D1 数据库实例
    const codes: string[] = [];
    const charset = "ABCDEFGHJKLMNPQRTUVWXY346789"; // 去掉易混淆字符
    const segmentLength = 4; // 每段长度
    const totalSegments = 2; // 总段数
    const codeLength = segmentLength * totalSegments; // 总长度

    try {
      for (let i = 0; i < count; i++) {
        let code: string;

        // 确保兑换码唯一性
        do {
          code = this.generateCode(charset, codeLength);
        } while (await this.isCodeExist(code, db)); // 检查数据库是否已存在该兑换码

        const formattedCode = this.formatCode(code, segmentLength); // 格式化为 4-4
        codes.push(formattedCode);

        // 插入到数据库
        const query = `
          INSERT INTO codes (code, quota, expiration_date, created_at, remarks, batch_id, is_active)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 1)
        `;
        await db
          .prepare(query)
          .bind(
            formattedCode,
            quota,
            expiration_date || null,
            remarks || null,
            batch_id || null
          )
          .run();
      }
      return codes;
    } catch (error) {
      console.error("Code Generation Error:", error);
      throw new Error("Failed to generate codes");
    }
  }

  // 生成随机兑换码
  static generateCode(charset: string, length: number): string {
    const bytes = generateRandomBytes(length); // 使用工具函数生成随机字节
    let code = "";

    for (let i = 0; i < length; i++) {
      const index = bytes[i] % charset.length; // 映射到字符集
      code += charset[index];
    }

    return code;
  }

  // 格式化兑换码为 4-4 格式
  static formatCode(code: string, segmentLength: number): string {
    const segments = [];
    for (let i = 0; i < code.length; i += segmentLength) {
      segments.push(code.slice(i, i + segmentLength));
    }
    return segments.join("-");
  }

  // 检查兑换码是否已存在
  static async isCodeExist(code: string, db: any): Promise<boolean> {
    const query = `SELECT COUNT(*) AS count FROM codes WHERE code = ?`;
    const result = await db.prepare(query).bind(code).first();

    return result && result.count > 0;
  }

  // 验证和兑换逻辑
  static async redeemCode({ env, code }: { env: any; code: string }) {
    const db = DB.getInstance(env); // 从 env 获取 D1 数据库实例

    try {
      const query = `SELECT * FROM codes WHERE code = ?`;
      const result = await db.prepare(query).bind(code).first();

      if (!result) {
        return { success: false, message: "兑换码无效" };
      }

      if (result.is_active === 0) {
        return { success: false, message: "兑换码已失效" };
      }

      if (result.expiration_date && new Date() > new Date(result.expiration_date)) {
        return { success: false, message: "兑换码已过期" };
      }

      // 更新兑换码状态，防止并发问题
      const updateQuery = `UPDATE codes SET is_active = 0 WHERE id = ? AND is_active = 1`;
      const updateResult = await db.prepare(updateQuery).bind(result.id).run();

      if (updateResult.changes === 0) {
        return { success: false, message: "兑换码已被使用" };
      }

      return { success: true, data: { quota: result.quota } };
    } catch (error) {
      console.error("Code Redeem Error:", error);
      return { success: false, message: "服务器内部错误" };
    }
  }
}
