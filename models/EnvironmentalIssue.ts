import mongoose, { Schema, Document } from 'mongoose';

export interface IEnvironmentalIssue extends Document {
  title: string;
  description: string;
  location: {
    type: string;
    coordinates: number[];
    address: string;
  };
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: {
    userId: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
  status: 'reported' | 'under-review' | 'in-progress' | 'resolved' | 'closed';
  images: string[];
  votes: number;
  assignedTo?: {
    role: string;
    id: mongoose.Types.ObjectId;
    name: string;
  };
  comments: Array<{
    text: string;
    author: string;
    authorRole: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const EnvironmentalIssueSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
        // [longitude, latitude]
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
      },
    },
    issueType: {
      type: String,
      required: [true, 'Issue type is required'],
      enum: [
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
      ],
    },
    severity: {
      type: String,
      required: [true, 'Severity level is required'],
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    reportedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
      },
      name: {
        type: String,
        required: [true, 'Reporter name is required'],
      },
      email: {
        type: String,
        required: [true, 'Reporter email is required'],
      },
    },
    status: {
      type: String,
      enum: ['reported', 'under-review', 'in-progress', 'resolved', 'closed'],
      default: 'reported',
    },
    images: [String],
    votes: {
      type: Number,
      default: 0,
    },
    assignedTo: {
      role: String,
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'assignedTo.role',
      },
      name: String,
    },
    comments: [
      {
        text: {
          type: String,
          required: true,
        },
        author: {
          type: String,
          required: true,
        },
        authorRole: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Add index for location-based queries
EnvironmentalIssueSchema.index({ location: '2dsphere' });

export default mongoose.models.EnvironmentalIssue || 
  mongoose.model<IEnvironmentalIssue>('EnvironmentalIssue', EnvironmentalIssueSchema);
