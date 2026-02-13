import { BinType } from "./Schedule";

export interface Notification {
  _id?: string;
  sentAt: Date;
  recipient: string; // phone number or group chat ID
  recipientName: string;
  binTypes: BinType[];
  status: "success" | "failed";
  message: string;
  errorDetails?: string;
  responsibleTenant?: string | null; // Name of the person responsible for this collection
  isTest?: boolean; // Whether this was a test notification
  notificationType?: "put-out" | "bring-in"; // The type of notification sent
  collectionDate?: string; // The target collection date (YYYY-MM-DD) for deduplication
  createdAt?: Date;
}
