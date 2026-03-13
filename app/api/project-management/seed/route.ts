import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import ProjectManagement from '@/models/ProjectManagement'
import { Types } from 'mongoose'

// Utility: parse Indian currency strings like "₹2.8Cr", "₹85L" to number of rupees
function parseINR(value: string | number | undefined): number {
	if (typeof value === 'number') return value
	if (!value) return 0
	const raw = value.replace(/[^0-9. a-zA-Z]/g, '').trim()
	// Detect Crore (Cr) and Lakh (L)
	if (/cr|crore/i.test(raw)) {
		const n = parseFloat(raw)
		return isNaN(n) ? 0 : n * 1e7
	}
	if (/l|lakh/i.test(raw)) {
		const n = parseFloat(raw)
		return isNaN(n) ? 0 : n * 1e5
	}
	// Fallback: plain number (assume rupees)
	const n = parseFloat(raw)
	return isNaN(n) ? 0 : n
}

// Seed payload based on "Active Projects" tab in NGO dashboard
const activeProjects = [
	{
		name: 'River Cleanup Campaign - Yamuna',
		volunteers: ['Anita Joshi', 'Ravi Mehta', 'Kavya Reddy'],
		status: 'active' as const,
		progress: 65,
		deadline: 'Dec 15, 2024',
		funding: '₹2.8Cr',
		location: 'Delhi-Agra stretch',
		impactMetrics: {
			wasteRemoved: '450 tons',
			waterQualityImprovement: '35%',
			volunteersEngaged: '420',
			communitiesReached: '12'
		},
		category: 'Water Conservation',
		priorityLevel: 'High'
	},
	{
		name: 'Urban Tree Planting Initiative',
		volunteers: ['Deepak Agarwal', 'Meera Nair', 'Suresh Iyer'],
		status: 'active' as const,
		progress: 40,
		deadline: 'Jan 30, 2025',
		funding: '₹1.5Cr',
		location: 'Mumbai Metropolitan Region',
		impactMetrics: {
			treesPlanted: '12,500',
			co2Offset: '180 tons/year',
			areasCovered: '8 districts',
			schoolsInvolved: '45'
		},
		category: 'Afforestation',
		priorityLevel: 'Medium'
	},
	{
		name: 'Plastic-Free Schools Campaign',
		volunteers: ['Pooja Verma', 'Amit Jain', 'Ritu Kapoor'],
		status: 'active' as const,
		progress: 80,
		deadline: 'Nov 20, 2024',
		funding: '₹85L',
		location: 'Bangalore Urban',
		impactMetrics: {
			schoolsCertified: '185/200',
			plasticReduced: '2.5 tons/month',
			studentsEducated: '45,000',
			teachersTrained: '850'
		},
		category: 'Waste Management',
		priorityLevel: 'High'
	},
	{
		name: 'Solar Energy Adoption - Rural Areas',
		volunteers: ['Sunita Rao', 'Vikram Singh', 'Priya Sharma'],
		status: 'active' as const,
		progress: 55,
		deadline: 'Feb 28, 2025',
		funding: '₹4.2Cr',
		location: 'Rajasthan Rural Districts',
		impactMetrics: {
			homesElectrified: '1,200',
			energyGenerated: '480 kWh/day',
			co2Reduced: '350 tons/year',
			villagesConnected: '18'
		},
		category: 'Renewable Energy',
		priorityLevel: 'High'
	},
	{
		name: 'Coastal Mangrove Restoration',
		volunteers: ['Arjun Menon', 'Lakshmi Nair', 'Rajesh Kumar'],
		status: 'active' as const,
		progress: 30,
		deadline: 'Jun 15, 2025',
		funding: '₹3.1Cr',
		location: 'Kerala Coastal Belt',
		impactMetrics: {
			areaRestored: '150 hectares',
			saplingsPlanted: '75,000',
			fishermenBenefited: '320',
			biodiversitySpecies: '28 protected'
		},
		category: 'Marine Conservation',
		priorityLevel: 'Medium'
	}
]

function toDateSafe(input: string, defaultDate: Date): Date {
	const d = new Date(input)
	return isNaN(d.getTime()) ? defaultDate : d
}

export async function POST(req: NextRequest) {
	try {
		await dbConnect()

		const body = await req.json().catch(() => ({} as any))
		const ngoId = body.ngoId || 'ngo_seed_001'
		const force = Boolean(body.force)

		const seeded: any[] = []

		for (const p of activeProjects) {
			const fundingTotal = parseINR(p.funding)
			// Derive dates: startDate ~ 6 months before deadline if we can parse; fallback to today
			const expectedEndDate = toDateSafe(p.deadline, new Date())
			const startDate = new Date(expectedEndDate)
			startDate.setMonth(startDate.getMonth() - 6)

			// Compute durations for stats
			const totalDays = Math.max(1, Math.ceil((expectedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
			const completedDays = Math.min(totalDays, Math.round((p.progress / 100) * totalDays))

			// Prepare contributors array from volunteer names
			const contributors = p.volunteers.map((name, idx) => ({
				id: `vol-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
				name,
				role: idx === 0 ? 'Site Coordinator' : 'Volunteer',
				contactInfo: `${name.split(' ')[0].toLowerCase()}@example.org`,
				joinDate: startDate,
				totalHoursContributed: Math.round(Math.random() * 500),
				xpPoints: Math.round(Math.random() * 1500)
			}))

			// Upsert project by projectName
			const projectId = new Types.ObjectId()

			const updateDoc: any = {
				projectId,
				projectName: p.name,
				ngoId,
				startDate,
				expectedEndDate,
				status: 'active',
				contributors,
				attendanceRecords: [],
				contributionRecords: [],
				dailyReports: [],
				cumulativeStats: {
					totalDays,
					completedDays,
					attendanceRate: 0,
					averageDailyProgress: p.progress,
					totalXPAwarded: contributors.reduce((sum: number, c: any) => sum + (c.xpPoints || 0), 0),
					fundingUtilized: 0,
					fundingTotal,
					environmentalImpact: p.impactMetrics
				},
				milestones: [
					{
						name: 'Project Deadline',
						description: 'Target completion date as per NGO dashboard plan',
						targetDate: expectedEndDate,
						status: 'pending'
					}
				],
				// Non-schema helper fields some APIs reference; schema is strict but update is allowed
				impactMetrics: p.impactMetrics,
				location: p.location,
				category: p.category,
				priorityLevel: p.priorityLevel,
				progress: p.progress,
				funding: p.funding
			}

			const existing = await ProjectManagement.findOne({ projectName: p.name })
			if (existing && !force) {
				seeded.push({ projectName: p.name, status: 'skipped', reason: 'already exists', id: existing._id })
				continue
			}

			const saved = await ProjectManagement.findOneAndUpdate(
				{ projectName: p.name },
				{ $set: updateDoc },
				{ new: true, upsert: true }
			)

			seeded.push({ projectName: p.name, status: existing ? 'updated' : 'created', id: saved._id })
		}

		return NextResponse.json({ success: true, seeded })
	} catch (err) {
		console.error('Seed error:', err)
		return NextResponse.json({ success: false, error: 'Failed to seed project data' }, { status: 500 })
	}
}

export async function GET() {
	try {
		await dbConnect()
		const projects = await ProjectManagement.find({}, { projectName: 1, status: 1, 'cumulativeStats.fundingTotal': 1 })
		return NextResponse.json({ count: projects.length, projects })
	} catch (err) {
		console.error('Seed list error:', err)
		return NextResponse.json({ error: 'Failed to list seeded projects' }, { status: 500 })
	}
}

