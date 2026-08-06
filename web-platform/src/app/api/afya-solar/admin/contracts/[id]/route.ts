import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSubscribers } from '@/lib/db/afyasolar-subscribers-schema'
import { eq } from 'drizzle-orm'
import { mapSubscriberToContract, reverseContractStatus } from '@/lib/admin/contract-mapping'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const subscriberId = Number(id)
    if (!Number.isFinite(subscriberId)) {
      return NextResponse.json({ error: 'Invalid contract id' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const existing = await db
      .select()
      .from(afyaSolarSubscribers)
      .where(eq(afyaSolarSubscribers.id, subscriberId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    const { subscriptionStatus, contractStatus } = reverseContractStatus(status)

    await db
      .update(afyaSolarSubscribers)
      .set({ subscriptionStatus, contractStatus, updatedAt: new Date() })
      .where(eq(afyaSolarSubscribers.id, subscriberId))

    const updated = await db
      .select()
      .from(afyaSolarSubscribers)
      .where(eq(afyaSolarSubscribers.id, subscriberId))
      .limit(1)

    return NextResponse.json({
      success: true,
      data: mapSubscriberToContract(updated[0]),
      message: 'Contract status updated successfully',
    })

  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}
