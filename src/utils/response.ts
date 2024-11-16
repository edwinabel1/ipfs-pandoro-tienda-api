export function formatSuccess(data: any, message = "Success") {
  return {
    success: true,
    message,
    data,
  };
}

export function formatError(message: string, code?: string) {
  return {
    success: false,
    message,
    ...(code && { code }), // 如果有错误码，则附加错误码
  };
}
