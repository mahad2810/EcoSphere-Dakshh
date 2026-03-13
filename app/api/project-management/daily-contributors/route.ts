import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ProjectManagement from '@/models/ProjectManagement'
import ContributorFeedback from '@/models/ContributorFeedback'
import { Types } from 'mongoose'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  return d
}

function toDateKey(date: any) {
  const d = date ? new Date(date) : new Date()
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0,10)
  return d.toISOString().slice(0,10)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, contribution } = body || {}

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })
    }
    if (!contribution?.contributorId) {
      return NextResponse.json({ error: 'contributorId is required' }, { status: 400 })
    }

    await dbConnect()
    const project = await ProjectManagement.findById(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

  const dateKey = toDateKey(contribution.date)
  const normalized = {
      contributorId: contribution.contributorId,
      contributorName: contribution.contributorName || (project.contributors || []).find((c: any) => c.id === contribution.contributorId)?.name || 'Unknown',
      date: startOfDay(new Date(contribution.date || Date.now())),
      hoursWorked: Number(contribution.hoursWorked || 0),
      tasksCompleted: Array.isArray(contribution.tasksCompleted)
        ? contribution.tasksCompleted
        : typeof contribution.tasksCompleted === 'string' && contribution.tasksCompleted
          ? (contribution.tasksCompleted as string).split('\n').map(t => t.trim()).filter(Boolean)
          : [],
      skillsApplied: Array.isArray(contribution.skillsApplied)
        ? contribution.skillsApplied
        : typeof contribution.skillsApplied === 'string' && contribution.skillsApplied
          ? (contribution.skillsApplied as string).split(',').map(s => s.trim()).filter(Boolean)
          : [],
      performanceRating: Math.max(1, Math.min(5, Number(contribution.performanceRating || 0))) || 0,
      notes: contribution.notes || ''
    }

  // XP calculation similar to existing daily-contributions logic
  const baseXP = 10
  const hoursXP = Math.min(normalized.hoursWorked * 5, 50)
  const performanceXP = (normalized.performanceRating - 3) * 10
  const skillsXP = normalized.skillsApplied.length * 5
  const totalXP = Math.max(baseXP + hoursXP + performanceXP + skillsXP, 0)

  // Use a safe key for nested map (Mongo doesn't allow '.' or '$' in field names)
  const contributorMapKey = String(normalized.contributorId).replace(/[.$]/g, '_')

  // 1) Push into flat records for backward compatibility
    await ProjectManagement.updateOne(
      { _id: projectId },
      { $push: { contributionRecords: normalized } }
    )

    // Also increment contributor stats (hours and xp) if contributor exists on project
    await ProjectManagement.updateOne(
      { _id: projectId },
      {
        $inc: {
          'contributors.$[c].totalHoursContributed': normalized.hoursWorked,
          'contributors.$[c].xpPoints': totalXP
        }
      },
      {
        arrayFilters: [{ 'c.id': normalized.contributorId }]
      } as any
    )

    // 2) Try to push into existing day bucket
  const pushExisting = await ProjectManagement.updateOne(
      { _id: projectId, 'contributionsByDay.dateKey': dateKey },
      { $push: { 'contributionsByDay.$.contributions': normalized } }
    )

    // 3) If no bucket existed, create one with the contribution
    if (!pushExisting.modifiedCount) {
      await ProjectManagement.updateOne(
        { _id: projectId },
        {
          $push: {
            contributionsByDay: {
              dateKey,
              date: startOfDay(new Date(contribution.date || Date.now())),
              contributions: [normalized]
            }
          }
        }
      )
    }

    // 4) Fetch and return the saved bucket only
    const proj = await ProjectManagement.findById(projectId, {
      contributionsByDay: { $elemMatch: { dateKey } }
    })
    const saved = (proj as any)?.contributionsByDay?.[0] || null

    // 5) Upsert into ContributorFeedback collection as per-contributor dictionary
  const upsertRes = await ContributorFeedback.updateOne(
      { projectId: new Types.ObjectId(projectId), dateKey },
      {
        $setOnInsert: {
          projectId: new Types.ObjectId(projectId),
          dateKey,
          date: startOfDay(new Date(contribution.date || Date.now())),
        },
        $set: {
      [`contributors.${contributorMapKey}.contributorId`]: normalized.contributorId,
      [`contributors.${contributorMapKey}.contributorName`]: normalized.contributorName,
        },
        $push: {
      [`contributors.${contributorMapKey}.entries`]: normalized,
        },
        $inc: {
      [`contributors.${contributorMapKey}.totalHours`]: normalized.hoursWorked,
      [`contributors.${contributorMapKey}.totalXP`]: totalXP,
        },
      },
      { upsert: true }
    )

    const feedbackDoc = await ContributorFeedback.findOne({ projectId: new Types.ObjectId(projectId), dateKey })

    return NextResponse.json({
      success: true,
      dateKey,
      bucket: saved,
      contributorFeedback: feedbackDoc,
      upsert: {
        matchedCount: (upsertRes as any)?.matchedCount ?? 0,
        modifiedCount: (upsertRes as any)?.modifiedCount ?? 0,
        upsertedId: (upsertRes as any)?.upsertedId ?? null,
      }
    })
  } catch (err) {
    console.error('POST /api/project-management/daily-contributors error:', err)
    return NextResponse.json({ error: 'Failed to save daily contribution' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const date = url.searchParams.get('date') // YYYY-MM-DD optional

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })
    }

    await dbConnect()
    const project = await ProjectManagement.findById(projectId, { contributionsByDay: 1 })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const buckets = (project as any).contributionsByDay || []
    if (date) {
      const key = date.length === 10 ? date : toDateKey(date)
      const bucket = buckets.find((b: any) => b.dateKey === key)
      return NextResponse.json({ success: true, bucket: bucket || null })
    }

    // Return sorted buckets (latest first)
    const sorted = [...buckets].sort((a: any, b: any) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0))
    return NextResponse.json({ success: true, buckets: sorted })
  } catch (err) {
    console.error('GET /api/project-management/daily-contributors error:', err)
    return NextResponse.json({ error: 'Failed to fetch daily contributions' }, { status: 500 })
  }
}
