import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ProjectManagement from '@/models/ProjectManagement'
import { Types } from 'mongoose'

function toValidDate(input: any) {
  const d = input ? new Date(input) : new Date()
  return isNaN(d.getTime()) ? new Date() : d
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

    // Ensure contributor exists and derive name if missing
    const contributor = (project.contributors || []).find((c: any) => c.id === contribution.contributorId)
    if (!contributor) {
      return NextResponse.json({ error: 'Contributor not found in this project' }, { status: 400 })
    }

    const entry = {
      contributorId: contribution.contributorId,
      contributorName: contribution.contributorName || contributor.name,
      date: toValidDate(contribution.date),
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

    const updated = await ProjectManagement.findByIdAndUpdate(
      projectId,
      { $push: { contributionRecords: entry } },
      { new: true }
    )

    const savedEntry = (updated?.contributionRecords || []).slice(-1)[0]
    return NextResponse.json({ success: true, contribution: savedEntry })
  } catch (err) {
    console.error('POST /api/project-management/contributions error:', err)
    return NextResponse.json({ error: 'Failed to add contribution feedback' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const contributorId = url.searchParams.get('contributorId')

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId is required' }, { status: 400 })
    }

    await dbConnect()
    const project = await ProjectManagement.findById(projectId, { contributionRecords: 1 })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let records: any[] = project.contributionRecords || []
    if (contributorId) {
      records = records.filter(r => r.contributorId === contributorId)
    }

    return NextResponse.json({ success: true, contributions: records })
  } catch (err) {
    console.error('GET /api/project-management/contributions error:', err)
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 })
  }
}
