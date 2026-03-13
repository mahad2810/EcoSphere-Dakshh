import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { DailyReport } from '@/models/DailyReport';
import { triggerImpactVerification } from '@/lib/impact-verification';

// GET: Fetch all daily reports with project name
export async function GET() {
  await dbConnect();
  try {
    const dailyReports = await DailyReport.find({})
      .sort({ submissionTime: -1 }) // Sort by newest first
      .lean();
    
    return NextResponse.json({ success: true, dailyReports });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

// POST: Save a daily report for a project
export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { projectName, report } = body;
  if (!projectName || !report) {
    return NextResponse.json({ error: 'Project name and report data are required' }, { status: 400 });
  }
  try {
    const dailyReport = new DailyReport({
      ...report,
      projectName: projectName,
      submissionTime: new Date(),
      status: 'submitted',
      verification: {
        status: 'pending',
        decision: 'manual_review',
        reasons: ['Submitted for autonomous verification.'],
        reviewRequired: true,
        rewardGranted: false,
      },
    });
    
    await dailyReport.save();

    const latitude = Number(report?.location?.latitude);
    const longitude = Number(report?.location?.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    triggerImpactVerification({
      submissionType: 'daily_report',
      submissionId: String(dailyReport._id),
      radiusMeters: 1500,
      projectAreaName: report?.location?.address || projectName,
      projectCenterLatitude: hasCoordinates ? latitude : undefined,
      projectCenterLongitude: hasCoordinates ? longitude : undefined,
    });
    
    return NextResponse.json({
      success: true,
      dailyReport,
      message: 'Daily report submitted and queued for autonomous verification.',
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
