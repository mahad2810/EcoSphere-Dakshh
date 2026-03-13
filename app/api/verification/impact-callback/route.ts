import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EnvironmentalIssue from '@/models/EnvironmentalIssue';
import { AttendanceRecord } from '@/models/AttendanceAndContribution';
import { DailyReport } from '@/models/DailyReport';
import User from '@/models/User';

interface CallbackBody {
  submissionType: 'environmental_issue' | 'attendance' | 'daily_report';
  submissionId: string;
  decision: 'approved' | 'rejected' | 'manual_review';
  confidence: number;
  reasons: string[];
  reviewRequired: boolean;
  agentReport?: string;
  fraudSignals?: string[];
  geoCheckSummary?: string;
  idempotencyKey?: string;
}

function mapIssueTypeToXP(issueType: string): number {
  const type = (issueType || '').toLowerCase();
  if (type.includes('deforestation') || type.includes('water-pollution')) return 30;
  if (type.includes('wildlife') || type.includes('industrial')) return 25;
  return 20;
}

async function awardXPIfNeeded(userId: string, xp: number, description: string, relatedItemId: string) {
  const user = await User.findById(userId);
  if (!user || xp <= 0) return 0;

  await user.addXP(xp, {
    eventType: 'issue_reported',
    description,
    timestamp: new Date(),
    relatedItemId,
  });
  return xp;
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.AI_VERIFICATION_CALLBACK_SECRET?.trim();
    if (configuredSecret) {
      const incomingSecret = req.headers.get('x-ai-verification-secret')?.trim();
      if (!incomingSecret || incomingSecret !== configuredSecret) {
        return NextResponse.json({ success: false, message: 'Unauthorized callback' }, { status: 401 });
      }
    }

    const body = (await req.json()) as CallbackBody;

    if (!body.submissionType || !body.submissionId || !body.decision) {
      return NextResponse.json({ success: false, message: 'Missing required callback fields' }, { status: 400 });
    }

    await connectDB();

    if (body.submissionType === 'environmental_issue') {
      const issue = await EnvironmentalIssue.findById(body.submissionId);
      if (!issue) return NextResponse.json({ success: false, message: 'Issue not found' }, { status: 404 });

      const priorKey = issue.verification?.idempotencyKey;
      if (priorKey && body.idempotencyKey && priorKey === body.idempotencyKey) {
        return NextResponse.json({ success: true, message: 'Duplicate callback ignored' });
      }

      issue.verification = {
        ...(issue.verification || {}),
        status: body.decision,
        decision: body.decision,
        confidence: body.confidence,
        reasons: body.reasons || [],
        reviewRequired: body.reviewRequired,
        agentReport: body.agentReport,
        fraudSignals: body.fraudSignals || [],
        geoCheckSummary: body.geoCheckSummary,
        idempotencyKey: body.idempotencyKey,
        verifiedAt: new Date(),
      };

      if (body.decision === 'approved') {
        issue.status = 'under-review';
        if (!issue.verification.rewardGranted) {
          const userId = String(issue.reportedBy?.userId || '');
          const xpAwarded = await awardXPIfNeeded(
            userId,
            mapIssueTypeToXP(issue.issueType),
            `Verified environmental report: ${issue.title}`,
            `issue-${issue._id}`
          );
          issue.verification.rewardGranted = xpAwarded > 0;
        }
      } else if (body.decision === 'rejected') {
        issue.status = 'closed';
      } else {
        issue.status = 'under-review';
      }

      await issue.save();
      return NextResponse.json({ success: true, message: 'Issue verification updated' });
    }

    if (body.submissionType === 'attendance') {
      const attendance = await AttendanceRecord.findById(body.submissionId);
      if (!attendance) return NextResponse.json({ success: false, message: 'Attendance not found' }, { status: 404 });

      const priorKey = attendance.verification?.idempotencyKey;
      if (priorKey && body.idempotencyKey && priorKey === body.idempotencyKey) {
        return NextResponse.json({ success: true, message: 'Duplicate callback ignored' });
      }

      attendance.verification = {
        ...(attendance.verification || {}),
        status: body.decision,
        decision: body.decision,
        confidence: body.confidence,
        reasons: body.reasons || [],
        reviewRequired: body.reviewRequired,
        agentReport: body.agentReport,
        fraudSignals: body.fraudSignals || [],
        geoCheckSummary: body.geoCheckSummary,
        idempotencyKey: body.idempotencyKey,
        verifiedAt: new Date(),
      };

      if (body.decision === 'approved' && !attendance.verification.rewardGranted) {
        const userId = String(attendance.contributorId || '');
        const workHours = attendance.workHours || 1;
        const xp = Math.max(10, Math.floor(workHours * 10));
        const awarded = await awardXPIfNeeded(
          userId,
          xp,
          `Verified attendance for ${attendance.projectName}`,
          `attendance-${attendance._id}`
        );
        attendance.verification.rewardGranted = awarded > 0;
        attendance.verification.xpAwarded = awarded;
        attendance.verifiedBy = 'AI_SYSTEM';
      }

      await attendance.save();
      return NextResponse.json({ success: true, message: 'Attendance verification updated' });
    }

    if (body.submissionType === 'daily_report') {
      const report = await DailyReport.findById(body.submissionId);
      if (!report) return NextResponse.json({ success: false, message: 'Daily report not found' }, { status: 404 });

      const priorKey = report.verification?.idempotencyKey;
      if (priorKey && body.idempotencyKey && priorKey === body.idempotencyKey) {
        return NextResponse.json({ success: true, message: 'Duplicate callback ignored' });
      }

      report.verification = {
        ...(report.verification || {}),
        status: body.decision,
        decision: body.decision,
        confidence: body.confidence,
        reasons: body.reasons || [],
        reviewRequired: body.reviewRequired,
        agentReport: body.agentReport,
        fraudSignals: body.fraudSignals || [],
        geoCheckSummary: body.geoCheckSummary,
        idempotencyKey: body.idempotencyKey,
        verifiedAt: new Date(),
      };

      if (body.decision === 'approved') {
        report.status = 'approved';
        if (!report.verification.rewardGranted) {
          const userId = String(report.reporterId || '');
          const photoBonus = Array.isArray(report.photos) ? Math.min(10, report.photos.length * 2) : 0;
          const xp = 25 + photoBonus;
          const awarded = await awardXPIfNeeded(
            userId,
            xp,
            `Verified daily report for ${report.projectName}`,
            `daily-report-${report._id}`
          );
          report.verification.rewardGranted = awarded > 0;
          report.verification.xpAwarded = awarded;
        }
      } else if (body.decision === 'rejected') {
        report.status = 'rejected';
      } else {
        report.status = 'manual_review';
      }

      await report.save();
      return NextResponse.json({ success: true, message: 'Daily report verification updated' });
    }

    return NextResponse.json({ success: false, message: 'Unsupported submission type' }, { status: 400 });
  } catch (error) {
    console.error('Impact callback error:', error);
    return NextResponse.json({ success: false, message: 'Internal callback error' }, { status: 500 });
  }
}
