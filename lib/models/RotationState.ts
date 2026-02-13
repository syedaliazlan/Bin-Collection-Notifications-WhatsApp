import { BinType } from "./Schedule";

// RotationKey can be a specific bin type or "global" for unified rotation
export type RotationKey = BinType | "global";

export interface RotationState {
  _id?: string;
  binType: RotationKey;
  currentTenantIndex: number;
  lastUpdated: Date;
  createdAt?: Date;
}
