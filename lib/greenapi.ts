interface SendMessageParams {
  chatId: string;
  message: string;
}

interface GreenAPIResponse {
  idMessage?: string;
  error?: string;
}

export class GreenAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "GreenAPIError";
  }
}

export async function sendWhatsAppMessage(
  chatId: string,
  message: string,
  retries = 3
): Promise<string> {
  const apiUrl = process.env.GREEN_API_URL || process.env.GREEN_API_BASE_URL;
  const instanceId = process.env.GREEN_API_ID;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!apiUrl || !instanceId || !apiToken) {
    throw new GreenAPIError("GreenAPI credentials not configured. Need GREEN_API_URL (or GREEN_API_BASE_URL), GREEN_API_ID, and GREEN_API_TOKEN");
  }

  // Format: https://{idInstance}.api.greenapi.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
  // Or use the apiUrl directly if provided
  const url = apiUrl.includes('api.greenapi.com') 
    ? `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`
    : `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: chatId,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new GreenAPIError(
          `GreenAPI request failed: ${errorText}`,
          response.status
        );
      }

      const data: GreenAPIResponse = await response.json();

      if (data.error) {
        throw new GreenAPIError(`GreenAPI error: ${data.error}`);
      }

      if (data.idMessage) {
        return data.idMessage;
      }

      throw new GreenAPIError("No message ID returned from GreenAPI");
    } catch (error) {
      if (attempt === retries) {
        if (error instanceof GreenAPIError) {
          throw error;
        }
        throw new GreenAPIError(
          `Failed to send message after ${retries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new GreenAPIError("Unexpected error in sendWhatsAppMessage");
}

export function formatPhoneNumber(phone: string): string {
  // If it's already a group chat ID, return as is
  if (phone.includes("@g.us")) {
    return phone;
  }
  
  // If it's already a personal chat ID, return as is
  if (phone.includes("@c.us")) {
    return phone;
  }

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If it starts with 0, replace with country code (assuming UK: 44)
  if (cleaned.startsWith("0")) {
    cleaned = "44" + cleaned.substring(1);
  }

  // Ensure it has country code
  if (!cleaned.startsWith("44")) {
    cleaned = "44" + cleaned;
  }

  // Format as WhatsApp chat ID: country code + number@c.us
  return `${cleaned}@c.us`;
}
