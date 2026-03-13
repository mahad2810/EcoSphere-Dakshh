import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import EnvironmentalIssue from '@/models/EnvironmentalIssue';
import { AttendanceRecord } from '@/models/AttendanceAndContribution';
import { DailyReport } from '@/models/DailyReport';

export async function GET(req: NextRequest) {
  const guard = requireAuth(req, ['ngo', 'government']);
  if (guard) return guard;

  try {
    await connectDB();

    const [issues, attendance, dailyReports] = await Promise.all([
      EnvironmentalIssue.find({ 'verification.decision': 'manual_review' })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      AttendanceRecord.find({ 'verification.decision': 'manual_review' })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      DailyReport.find({ 'verification.decision': 'manual_review' })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      queue: {
        issues,
        attendance,
        dailyReports,
      },
      totals: {
        issues: issues.length,
        attendance: attendance.length,
        dailyReports: dailyReports.length,
        all: issues.length + attendance.length + dailyReports.length,
      },
    });
  } catch (error) {
    console.error('Review queue fetch failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to load review queue' }, { status: 500 });
  }
}
