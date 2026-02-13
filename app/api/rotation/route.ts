import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Tenant } from "@/lib/models/Tenant";
import { RotationState } from "@/lib/models/RotationState";

export const dynamic = "force-dynamic";

/**
 * GET /api/rotation - View current rotation state and tenant order
 */
export async function GET() {
  try {
    const db = await getDatabase();
    const rotationCollection = db.collection<RotationState>("rotation_states");
    const tenantsCollection = db.collection<Tenant>("tenants");

    const rotationState = await rotationCollection.findOne({ binType: "global" });
    const tenants = await tenantsCollection
      .find({ active: true })
      .sort({ rotationOrder: 1 })
      .toArray();

    const currentIndex = rotationState?.currentTenantIndex ?? 0;
    const currentTenant = tenants[currentIndex] || tenants[0] || null;

    return NextResponse.json({
      currentTenantIndex: currentIndex,
      currentTenant: currentTenant?.name || null,
      totalTenants: tenants.length,
      tenants: tenants.map((t, i) => ({
        index: i,
        name: t.name,
        rotationOrder: t.rotationOrder,
        isCurrent: i === currentIndex,
        isNext: i === (currentIndex + 1) % tenants.length,
      })),
      lastUpdated: rotationState?.lastUpdated || null,
      note: "currentTenantIndex points to who is responsible for the NEXT collection (the one shown in the hero). After a put-out notification is sent, it advances to the next person.",
    });
  } catch (error) {
    console.error("Error fetching rotation state:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation state" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rotation - Set rotation to a specific tenant index
 * Body: { currentTenantIndex: number }
 * 
 * Use this to fix rotation after it gets out of sync.
 * The index refers to the position in the active tenants list sorted by rotationOrder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentTenantIndex } = body;

    if (typeof currentTenantIndex !== "number" || currentTenantIndex < 0) {
      return NextResponse.json(
        { error: "currentTenantIndex must be a non-negative number" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rotationCollection = db.collection<RotationState>("rotation_states");
    const tenantsCollection = db.collection<Tenant>("tenants");

    const tenants = await tenantsCollection
      .find({ active: true })
      .sort({ rotationOrder: 1 })
      .toArray();

    if (tenants.length === 0) {
      return NextResponse.json(
        { error: "No active tenants found" },
        { status: 400 }
      );
    }

    const safeIndex = currentTenantIndex % tenants.length;

    // Upsert the global rotation state
    await rotationCollection.updateOne(
      { binType: "global" },
      {
        $set: {
          currentTenantIndex: safeIndex,
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    const tenant = tenants[safeIndex];

    return NextResponse.json({
      success: true,
      message: `Rotation set to index ${safeIndex} (${tenant.name}). This person will be responsible for the next collection.`,
      currentTenantIndex: safeIndex,
      currentTenant: tenant.name,
      allTenants: tenants.map((t, i) => ({
        index: i,
        name: t.name,
        isCurrent: i === safeIndex,
      })),
    });
  } catch (error) {
    console.error("Error setting rotation state:", error);
    return NextResponse.json(
      { error: "Failed to set rotation state" },
      { status: 500 }
    );
  }
}
