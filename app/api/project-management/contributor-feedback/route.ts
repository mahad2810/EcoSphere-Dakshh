import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ContributorFeedback from '@/models/ContributorFeedback'
import { Types } from 'mongoose'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const dateKey = url.searchParams.get('dateKey') // YYYY-MM-DD optional

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })
    }

    await dbConnect()

    if (dateKey) {
      const doc = await ContributorFeedback.findOne({ projectId: new Types.ObjectId(projectId), dateKey })
      return NextResponse.json({ success: true, doc })
    }

    const docs = await ContributorFeedback.find({ projectId: new Types.ObjectId(projectId) }).sort({ date: -1 })
    return NextResponse.json({ success: true, docs })
  } catch (err) {
    console.error('GET /api/project-management/contributor-feedback error:', err)
    return NextResponse.json({ error: 'Failed to fetch contributor feedback' }, { status: 500 })
  }
}
