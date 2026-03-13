import mongoose, { Schema, Document } from 'mongoose'

interface IContributorEntry {
  contributorId: string
  contributorName: string
  date: Date
  hoursWorked: number
  tasksCompleted: string[]
  skillsApplied: string[]
  performanceRating: number
  notes: string
}

interface IContributorBucket {
  contributorId: string
  contributorName: string
  entries: IContributorEntry[]
  totalHours: number
  totalXP: number
}

export interface IContributorFeedback extends Document {
  projectId: mongoose.Types.ObjectId
  dateKey: string // YYYY-MM-DD
  date: Date // start of day
  // Dictionary keyed by contributorId
  contributors: Map<string, IContributorBucket>
}

const contributorEntrySchema = new Schema<IContributorEntry>({
  contributorId: { type: String, required: true },
  contributorName: { type: String, required: true },
  date: { type: Date, required: true },
  hoursWorked: { type: Number, required: true },
  tasksCompleted: [{ type: String }],
  skillsApplied: [{ type: String }],
  performanceRating: { type: Number, min: 1, max: 5, required: true },
  notes: { type: String },
}, { _id: false })

const contributorSchema = new Schema<IContributorBucket>({
  contributorId: { type: String, required: true },
  contributorName: { type: String, required: true },
  entries: { type: [contributorEntrySchema], default: [] },
  totalHours: { type: Number, default: 0 },
  totalXP: { type: Number, default: 0 },
}, { _id: false })

const contributorFeedbackSchema = new Schema<IContributorFeedback>({
  projectId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'ProjectManagement' },
  dateKey: { type: String, required: true, index: true },
  date: { type: Date, required: true },
  contributors: { type: Map, of: contributorSchema, default: {} },
}, { timestamps: true })

contributorFeedbackSchema.index({ projectId: 1, dateKey: 1 }, { unique: true })

export default mongoose.models.ContributorFeedback || mongoose.model<IContributorFeedback>('ContributorFeedback', contributorFeedbackSchema)
