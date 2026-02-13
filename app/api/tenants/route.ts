import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db";
import { Tenant } from "@/lib/models/Tenant";

export async function GET() {
  try {
    const db = await getDatabase();
    const tenants = await db
      .collection<Tenant>("tenants")
      .find({})
      .sort({ rotationOrder: 1 })
      .toArray();

    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, active } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Get current max rotation order to auto-assign
    const maxTenant = await db
      .collection<Tenant>("tenants")
      .findOne({}, { sort: { rotationOrder: -1 } });
    
    const nextRotationOrder = maxTenant
      ? maxTenant.rotationOrder + 1
      : 0;

    const tenant: Tenant = {
      name: name.trim(),
      rotationOrder: nextRotationOrder,
      active: active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Tenant>("tenants").insertOne(tenant);

    return NextResponse.json(
      { ...tenant, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

// PATCH - Bulk update rotation order for all tenants
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { order } = body;

    // Validate input: order should be an array of tenant IDs in the new order
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json(
        { error: "Order must be a non-empty array of tenant IDs" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const tenantsCollection = db.collection<Tenant>("tenants");

    // Update each tenant's rotationOrder based on their position in the array
    const updatePromises = order.map((id: string, index: number) =>
      tenantsCollection.updateOne(
        { _id: new ObjectId(id) as any },
        {
          $set: {
            rotationOrder: index,
            updatedAt: new Date(),
          },
        }
      )
    );

    await Promise.all(updatePromises);

    // Return the updated list
    const tenants = await tenantsCollection
      .find({})
      .sort({ rotationOrder: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      message: "Rotation order updated successfully",
      tenants,
    });
  } catch (error) {
    console.error("Error updating rotation order:", error);
    return NextResponse.json(
      { error: "Failed to update rotation order" },
      { status: 500 }
    );
  }
}
