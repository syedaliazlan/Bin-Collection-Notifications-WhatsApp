import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Tenant } from "@/lib/models/Tenant";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const tenant = await db
      .collection<Tenant>("tenants")
      .findOne({ _id: new ObjectId(id) as any });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, active } = body;

    const db = await getDatabase();
    const updateData: Partial<Tenant> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (active !== undefined) updateData.active = active;

    const result = await db
      .collection<Tenant>("tenants")
      .findOneAndUpdate(
        { _id: new ObjectId(id) as any },
        { $set: updateData },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const result = await db
      .collection<Tenant>("tenants")
      .deleteOne({ _id: new ObjectId(id) as any });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
