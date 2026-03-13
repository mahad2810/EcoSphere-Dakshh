import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ProjectManagement from '@/models/ProjectManagement'
import { Types } from 'mongoose'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
    }

    await dbConnect()
    const project = await ProjectManagement.findById(id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (err) {
    console.error('GET /api/project-management/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}
