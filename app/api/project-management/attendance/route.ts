import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProjectManagement from '@/models/ProjectManagement';
import { AttendanceRecord } from '@/models/AttendanceAndContribution';
import { Types } from 'mongoose';

// Simplified helper function for testing
function getSimpleAddress(lat: number, lng: number): string {
  return `Location: ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    console.log('📍 Attendance POST route called');
    
    const body = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
    const { projectId, attendance } = body;
    
    // Basic validation
    if (!projectId) {
      console.log('❌ Missing projectId');
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!attendance) {
      console.log('❌ Missing attendance data');
      return NextResponse.json({ error: 'Attendance data is required' }, { status: 400 });
    }

    console.log('🔌 Connecting to database...');
    await dbConnect();
    console.log('✅ Database connected');
    
    // Simple attendance record creation
    const simpleAttendanceRecord = {
      projectId: new Types.ObjectId(projectId),
      projectName: attendance.projectName || 'Test Project',
      contributorId: attendance.contributorId || attendance.userId || 'test-user',
      contributorName: attendance.contributorName || attendance.userName || 'Test User',
      userId: attendance.userId || 'test-user',
      userName: attendance.userName || 'Test User',
      entryTime: attendance.entryTime || new Date(),
      exitTime: attendance.exitTime || null,
      status: attendance.status || 'present',
      date: new Date(),
      entryPhotoUrl: attendance.entryPhotoUrl || attendance.photoUrl || 'test-photo-url',
      exitPhotoUrl: attendance.exitPhotoUrl || null,
      notes: attendance.notes || '',
      workHours: null,
      verifiedBy: null,
      gpsLocationEntry: {
        latitude: attendance.gpsLocationEntry?.latitude || 0,
        longitude: attendance.gpsLocationEntry?.longitude || 0,
        address: getSimpleAddress(
          attendance.gpsLocationEntry?.latitude || 0,
          attendance.gpsLocationEntry?.longitude || 0
        )
      },
      gpsLocationExit: null
    };
    
    console.log('💾 Creating attendance record:', simpleAttendanceRecord);
    
    // Save the attendance record
    const newAttendanceRecord = new AttendanceRecord(simpleAttendanceRecord);
    const savedRecord = await newAttendanceRecord.save();
    
    console.log('✅ Attendance record saved:', savedRecord._id);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully',
      attendanceRecord: savedRecord,
      location: simpleAttendanceRecord.gpsLocationEntry.address
    });
    
  } catch (error) {
    console.error('❌ Error in attendance POST:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record attendance', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('📝 Attendance PUT route called');
    
    const body = await req.json();
    const { attendanceId, exitData } = body;
    
    console.log('📦 PUT request body:', { attendanceId, exitData });
    
    if (!attendanceId || !exitData) {
      console.log('❌ Missing required data for PUT');
      return NextResponse.json({ error: 'Attendance ID and exit data are required' }, { status: 400 });
    }

    console.log('🔌 Connecting to database...');
    await dbConnect();
    
    // Find and update the attendance record directly
    const updatedRecord = await AttendanceRecord.findByIdAndUpdate(
      attendanceId,
      {
        exitTime: exitData.exitTime || new Date(),
        status: 'completed'
      },
      { new: true }
    );
    
    if (!updatedRecord) {
      console.log('❌ Attendance record not found');
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }
    
    console.log('✅ Attendance record updated:', updatedRecord._id);
    
    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
      attendanceRecord: updatedRecord
    });
    
  } catch (error) {
    console.error('❌ Error in attendance PUT:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update attendance record',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('📖 Attendance GET route called');
    
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    
    console.log('📦 GET projectId:', projectId);
    
    if (!projectId) {
      console.log('❌ Missing projectId in GET');
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('🔌 Connecting to database...');
    await dbConnect();
    
    // Simply fetch all attendance records for the project
    const attendanceRecords = await AttendanceRecord.find({
      projectId: new Types.ObjectId(projectId)
    }).sort({ date: -1 }); // Sort by most recent first
    
    console.log(`✅ Found ${attendanceRecords.length} attendance records`);
    
    return NextResponse.json({
      success: true,
      count: attendanceRecords.length,
      attendanceRecords
    });
    
  } catch (error) {
    console.error('❌ Error in attendance GET:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance records',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
