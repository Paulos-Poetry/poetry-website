import mongoose, { Document } from "mongoose";

export interface Translation extends Document {
  title: string;
  pdf:Buffer;
  content: string;
  createdAt: Date;
}

const TranslationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    pdf: { type: Buffer, required: true },
    contentType: { type: String, default: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<Translation>("Translation", TranslationSchema);

