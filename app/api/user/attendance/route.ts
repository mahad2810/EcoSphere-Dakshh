import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import { AttendanceRecord } from '@/models/AttendanceAndContribution';
import User from '@/models/User';
import { Types } from 'mongoose';

export async function POST(req: NextRequest) {
  const guard = requireAuth(req);
  if (guard) return guard;

  try {
    const authUser = getAuthUser(req)!;
    const userId = authUser.sub;

    const body = await req.json();
    const {
      projectId,
      userName,
      type,
      timestamp,
      location,
      photoData,
      notes,
      projectTitle,
      organization,
      aiVerification,
    } = body;

    if (!projectId || !type || !location || !photoData) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, type, location, photoData' },
        { status: 400 }
      );
    }

    if (!['checkin', 'checkout'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid attendance type. Must be "checkin" or "checkout"' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find existing attendance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let attendanceRecord = await AttendanceRecord.findOne({
      projectId: new Types.ObjectId(projectId),
      contributorId: userId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (type === 'checkin') {
      if (attendanceRecord && attendanceRecord.entryTime) {
        return NextResponse.json(
          { error: 'You have already checked in today for this project' },
          { status: 400 }
        );
      }

      if (!attendanceRecord) {
        attendanceRecord = new AttendanceRecord({
          projectId: new Types.ObjectId(projectId),
          contributorId: userId,
          contributorName: userName || authUser.name || 'Unknown User',
          date: new Date(),
          entryTime: new Date(timestamp),
          gpsLocationEntry: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || 'Unknown location',
          },
          entryPhotoUrl: photoData,
          status: 'present',
          notes: notes || '',
          exitTime: null,
          gpsLocationExit: null,
          exitPhotoUrl: null,
          workHours: null,
          verifiedBy: 'AI_SYSTEM',
          aiVerification: aiVerification || null,
        });
      } else {
        attendanceRecord.entryTime = new Date(timestamp);
        attendanceRecord.gpsLocationEntry = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Unknown location',
        };
        attendanceRecord.entryPhotoUrl = photoData;
        attendanceRecord.status = 'present';
        attendanceRecord.notes = notes || '';
      }

      await attendanceRecord.save();

      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          'projectParticipation.activeProjects': {
            projectId: new Types.ObjectId(projectId),
            title: projectTitle,
            organization,
            joinedAt: new Date(),
            lastActivity: new Date(),
            checkedIn: true,
            lastCheckIn: new Date(timestamp),
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Check-in recorded successfully',
        attendanceId: attendanceRecord._id,
        checkInTime: attendanceRecord.entryTime,
      });
    } else if (type === 'checkout') {
      if (!attendanceRecord || !attendanceRecord.entryTime) {
        return NextResponse.json(
          { error: 'You must check in first before checking out' },
          { status: 400 }
        );
      }

      if (attendanceRecord.exitTime) {
        return NextResponse.json(
          { error: 'You have already checked out today for this project' },
          { status: 400 }
        );
      }

      const checkInTime = new Date(attendanceRecord.entryTime);
      const checkOutTime = new Date(timestamp);
      const workHours = Math.max(0, (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      attendanceRecord.exitTime = checkOutTime;
      attendanceRecord.gpsLocationExit = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || 'Unknown location',
      };
      attendanceRecord.exitPhotoUrl = photoData;
      attendanceRecord.workHours = Math.round(workHours * 100) / 100;
      attendanceRecord.notes = attendanceRecord.notes
        ? `${attendanceRecord.notes}\n\nCheckout Notes: ${notes || ''}`
        : notes || '';

      await attendanceRecord.save();

      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            'projectParticipation.activeProjects.$[project].checkedIn': false,
            'projectParticipation.activeProjects.$[project].lastActivity': new Date(),
            'projectParticipation.activeProjects.$[project].lastCheckOut': checkOutTime,
            'projectParticipation.activeProjects.$[project].totalHours': workHours,
          },
        },
        { arrayFilters: [{ 'project.projectId': new Types.ObjectId(projectId) }] }
      );

      const xpEarned = Math.max(5, Math.floor(workHours * 10));

      await User.findByIdAndUpdate(userId, {
        $inc: {
          xp: xpEarned,
          'stats.totalHoursContributed': workHours,
          'stats.totalProjectsCompleted': workHours >= 1 ? 1 : 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Check-out recorded successfully',
        attendanceId: attendanceRecord._id,
        checkOutTime: attendanceRecord.exitTime,
        workHours: attendanceRecord.workHours,
        xpEarned,
      });
    }
  } catch (error) {
    console.error('Error processing attendance:', error);
    return NextResponse.json({ error: 'Internal server error. Please try again later.' }, { status: 500 });
  }
}

// GET: fetch user's attendance history — JWT-protected
export async function GET(req: NextRequest) {
  const guard = requireAuth(req);
  if (guard) return guard;

  try {
    const authUser = getAuthUser(req)!;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10');

    await dbConnect();

    const query: any = { contributorId: authUser.sub };
    if (projectId) {
      query.projectId = new Types.ObjectId(projectId);
    }

    const attendanceRecords = await AttendanceRecord.find(query).sort({ date: -1 }).limit(limit);

    return NextResponse.json({ success: true, attendance: attendanceRecords });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
