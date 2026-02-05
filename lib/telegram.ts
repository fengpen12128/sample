type TelegramGetFileResponse = {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_path?: string;
    file_size?: number;
  };
  description?: string;
};

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }
  return token;
}

export async function getTelegramFile(fileId: string) {
  const token = getTelegramToken();
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
  );
  const data = (await response.json()) as TelegramGetFileResponse;
  if (!response.ok || !data.ok || !data.result?.file_path) {
    throw new Error(data.description || "Failed to fetch Telegram file info");
  }
  return data.result;
}

export async function downloadTelegramFile(filePath: string) {
  const token = getTelegramToken();
  const response = await fetch(`${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`);
  if (!response.ok) {
    throw new Error("Failed to download Telegram file");
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const token = getTelegramToken();
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to send Telegram message");
  }
}
