export type BinType = "general_waste" | "paper_card" | "glass_cans_plastics";

export interface Schedule {
  _id?: string;
  collectionDay: string; // "Tuesday"
  binTypes: BinType[];
  weekPattern: "odd" | "even" | "all";
  notificationTime: string; // "17:00" (5:00 PM) - for putting bins out
  bringInTime: string; // "17:00" (5:00 PM) - for bringing bins back in
  groupChatId: string; // WhatsApp group chat ID for LIVE notifications (e.g., 123456789@g.us)
  testChatId?: string; // WhatsApp chat ID for TEST notifications (can be personal or group)
  rotationEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
