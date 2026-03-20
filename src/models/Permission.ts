import mongoose, { Schema, Document } from "mongoose";

export interface IPermission extends Document {
  name: string;
  code: string;
  isActive: boolean;
  deletedAt: Date;
}

const PermissionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required!"],
    },
    code: {
      type: String,
      required: [true, "Code is required!"],
      unique: true,
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Permission = mongoose.model<IPermission>("Permission", PermissionSchema);

export default Permission;
