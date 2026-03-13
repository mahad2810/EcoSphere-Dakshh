import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import EnvironmentalIssue from '@/models/EnvironmentalIssue';
import { triggerImpactVerification } from '@/lib/impact-verification';
import mongoose from 'mongoose';

function normalizeIssueType(category: string): string {
  const candidate = (category || '').trim().toLowerCase();
  const allowed = new Set([
    'water-pollution',
    'air-pollution',
    'deforestation',
    'waste-disposal',
    'wildlife-endangerment',
    'noise-pollution',
    'soil-erosion',
    'pollution',
    'waste',
    'industrial',
    'other',
  ]);
  return allowed.has(candidate) ? candidate : 'other';
}

function severityFromText(description: string): 'low' | 'medium' | 'high' | 'critical' {
  const text = (description || '').toLowerCase();
  if (text.includes('hazard') || text.includes('toxic') || text.includes('emergency')) return 'critical';
  if (text.includes('severe') || text.includes('large') || text.includes('major')) return 'high';
  if (text.includes('minor') || text.includes('small')) return 'low';
  return 'medium';
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();
    const userId = formData.get('userId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const location = formData.get('location') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const images = formData.getAll('images') as File[];

    if (!userId || !title || !description || !location) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const imageDataUrls: string[] = [];
    for (const image of images) {
      if (!image || image.size === 0) continue;
      const bytes = await image.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      imageDataUrls.push(`data:${image.type};base64,${base64}`);
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

    const issue = new EnvironmentalIssue({
      title: title.trim(),
      description: description.trim(),
      location: {
        type: 'Point',
        coordinates: hasCoordinates ? [lng, lat] : [0, 0],
        address: location,
      },
      issueType: normalizeIssueType(category),
      severity: severityFromText(description),
      reportedBy: {
        userId: new mongoose.Types.ObjectId(user._id),
        name: user.name,
        email: user.email,
      },
      status: 'reported',
      images: imageDataUrls,
      votes: 1,
      verification: {
        status: 'pending',
        decision: 'manual_review',
        reasons: ['Submitted for autonomous verification.'],
        reviewRequired: true,
        rewardGranted: false,
      },
    });

    await issue.save();

    triggerImpactVerification({
      submissionType: 'environmental_issue',
      submissionId: String(issue._id),
      radiusMeters: 1000,
      projectAreaName: location,
      projectCenterLatitude: hasCoordinates ? lat : undefined,
      projectCenterLongitude: hasCoordinates ? lng : undefined,
    });

    return NextResponse.json({
      success: true,
      issueId: issue._id,
      status: 'pending_verification',
      message: 'Report submitted. Verification is in progress and rewards are granted only after approval.',
    });
  } catch (error) {
    console.error('Error submitting environmental issue:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing your report. Please try again.',
      },
      { status: 500 }
    );
  }
}
