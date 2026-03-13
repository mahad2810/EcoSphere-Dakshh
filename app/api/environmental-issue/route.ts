import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EnvironmentalIssue from '@/models/EnvironmentalIssue';
import mongoose from 'mongoose';
import { getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { 
      title, 
      description, 
      location, 
      issueType, 
      severity = 'medium',
      userId,
      images = []
    } = body;

    // Input validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!location || !location.coordinates || !location.address) {
      return NextResponse.json(
        { error: 'Location with coordinates and address is required' },
        { status: 400 }
      );
    }

    if (!issueType) {
      return NextResponse.json(
        { error: 'Issue type is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create environmental issue
    const newIssue = new EnvironmentalIssue({
      title,
      description,
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address,
      },
      issueType,
      severity,
      reportedBy: {
        userId: new mongoose.Types.ObjectId(userId),
        name: user.name,
        email: user.email,
      },
      status: 'reported',
      images,
      votes: 1, // Initial vote from the reporter
    });

    await newIssue.save();

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Environmental issue reported successfully',
        issue: {
          id: newIssue._id,
          title: newIssue.title,
          status: newIssue.status,
          createdAt: newIssue.createdAt
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error reporting environmental issue:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const issueType = url.searchParams.get('issueType');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    const query: any = {};
    
    // Filter by user if userId provided
    if (userId) {
      query['reportedBy.userId'] = new mongoose.Types.ObjectId(userId);
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by issue type if provided
    if (issueType) {
      query.issueType = issueType;
    }
    
    const skip = (page - 1) * limit;
    
    const issues = await EnvironmentalIssue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await EnvironmentalIssue.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      issues,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching environmental issues:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}
