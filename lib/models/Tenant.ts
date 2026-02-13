export interface Tenant {
  _id?: string;
  name: string;
  rotationOrder: number; // Auto-assigned based on creation order
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
