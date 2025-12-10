import mongoose, { Schema, Document } from "mongoose";
import QuizAttempt from "./QuizAttempt";

export interface IUser extends Document {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  age?: number;
  occupation?:string;
  organization?:string;
  address?: string;
  profile?: string;
  password?: string;
  bio?: string;
  role?: mongoose.Types.ObjectId | null;
  isActive?: boolean;
  isVerified?: boolean;
  getTotalAssessmentsCompleted: () => Promise<number>;
}

const UserSchema: Schema = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    occupation: { type: String },
    organization: { type: String },
    username: { type: String },
    email: { type: String },
    phone: {
      type: String,
    },
    age: { type: Number },
    address: { type: String },
    profile: { type: String },
    bio: { type: String },
    password: { type: String },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Add this after defining UserSchema

UserSchema.virtual("name").get(function () {
  // Use function() to access 'this'
  const firstName = this.firstName || "";
  const lastName = this.lastName || "";
  return `${firstName} ${lastName}`.trim();
});

// To include virtuals in JSON output
UserSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.id;

    return ret;
  },
});
UserSchema.set("toObject", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.id;

    return ret;
  },
});

UserSchema.methods.getTotalAssessmentsCompleted = async function () {
  return await QuizAttempt.countDocuments({
    user: this._id,
    status: "completed",
  });
};

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
