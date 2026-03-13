import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ProjectManagement from '@/models/ProjectManagement'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const ngoId = url.searchParams.get('ngoId') || undefined

    await dbConnect()

    const query: any = { status: 'active' }
    if (ngoId) query.ngoId = ngoId

    const projects = await ProjectManagement.find(query)
      .sort({ updatedAt: -1 })
      .limit(Math.min(100, Math.max(1, limit)))
      .lean()

    // Normalize to shape the NGO dashboard expects
    const items = projects.map((p: any) => ({
      id: p._id?.toString(),
      name: p.projectName,
      volunteers: (p.contributors || []).map((c: any) => c.name),
      status: p.status === 'active' ? 'Active' : p.status,
      progress: p.progress ?? Math.round(p.cumulativeStats?.averageDailyProgress || 0),
      deadline: p.expectedEndDate ? new Date(p.expectedEndDate).toDateString() : 'TBD',
      funding: p.funding ?? (p.cumulativeStats?.fundingTotal ? `₹${Math.round(p.cumulativeStats.fundingTotal).toLocaleString()}` : '₹0'),
      location: p.location || 'TBD',
      impactMetrics: p.impactMetrics || p.cumulativeStats?.environmentalImpact || {},
      category: p.category || 'General',
      priorityLevel: p.priorityLevel || 'Medium',
    }))

    return NextResponse.json({ success: true, projects: items })
  } catch (err) {
    console.error('GET /api/ngo/active-projects failed:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch active projects' }, { status: 500 })
  }
}
