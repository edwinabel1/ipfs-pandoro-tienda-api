import { PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class MultipartUploadService {
  // 初始化分片上传
  static async initializeMultipartUpload(env: any, session_id: string, file_name: string) {
    const objectKey = `${session_id}/${file_name}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: env.BUCKET.name, // 使用绑定的 BUCKET 名称
      Key: objectKey,
    });

    const response = await env.BUCKET.client.send(command);

    return {
      upload_id: response.UploadId,
      object_key: objectKey,
    };
  }

  // 生成分片上传预签名 URL
  static async generatePartUploadUrl(env: any, object_key: string, upload_id: string, part_number: number) {
    const command = new UploadPartCommand({
      Bucket: env.BUCKET.name,
      Key: object_key,
      UploadId: upload_id,
      PartNumber: part_number,
    });

    const signedUrl = await getSignedUrl(env.BUCKET.client, command, { expiresIn: 900 }); // URL 有效期 15 分钟

    return {
      signed_url: signedUrl,
      part_number: part_number,
    };
  }

  // 完成分片上传
  static async completeMultipartUpload(env: any, object_key: string, upload_id: string, parts: Array<{ ETag: string; PartNumber: number }>) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: env.BUCKET.name,
      Key: object_key,
      UploadId: upload_id,
      MultipartUpload: { Parts: parts },
    });

    await env.BUCKET.client.send(command);

    return { success: true };
  }
}
