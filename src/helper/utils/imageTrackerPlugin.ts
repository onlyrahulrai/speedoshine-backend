import { Schema } from "mongoose";
import Upload from "../../models/Upload";

function extractUrls(value: any, urls: Set<string>) {
  if (typeof value === "string") {
    if (value.includes("/api/uploads/")) {
      // 1. Add the raw value directly (covers cases where the field is exactly the URL, even with spaces)
      urls.add(value);

      // 2. Extract URLs hidden inside HTML-like structures (e.g. src="http://.../file with space.jpg")
      const quoteRegex = /["']([^"']*?\/api\/uploads\/[^"']*?)["']/g;
      let match;
      while ((match = quoteRegex.exec(value)) !== null) {
        urls.add(match[1]);
      }

      // 3. Fallback regex for standard spaceless URLs inside unstructured text
      const urlRegex = /(?:https?:\/\/[^\s"'<>]*)?\/api\/uploads\/[^\s"'<>]+/g;
      const matches = value.match(urlRegex);
      if (matches) {
        matches.forEach(m => urls.add(m));
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach(item => extractUrls(item, urls));
  } else if (value && typeof value === "object") {
    // Avoid circular structures by limiting depth, but mongoose docs toJSON don't have circulars
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        extractUrls(value[key], urls);
      }
    }
  }
}

export function imageTrackerPlugin(schema: Schema) {
  schema.pre("save", async function (next) {
    try {
      console.log("Hello World");

      // Skip the Upload model itself
      if ((this.constructor as any).modelName === "Upload") {
        return next();
      }

      const doc = this.toJSON ? this.toJSON() : this.toObject();

      const urls = new Set<string>();

      extractUrls(doc, urls);

      console.log("Urls", doc, urls);

      if (urls.size > 0) {
        await Upload.updateMany(
          { url: { $in: Array.from(urls) }, used: false },
          { $set: { used: true } }
        );
      }

      next();
    } catch (error) {
      console.error("Error in imageTrackerPlugin (save):", error);
      next();
    }
  });

  const handleUpdate = async function (this: any, next: any) {
    try {
      // skip for Upload schema
      if (this.model && this.model.modelName === "Upload") {
        return next();
      }

      const update = this.getUpdate();
      if (!update) return next();

      const urls = new Set<string>();
      extractUrls(update, urls);

      if (urls.size > 0) {
        await Upload.updateMany(
          { url: { $in: Array.from(urls) }, used: false },
          { $set: { used: true } }
        );
      }
      next();
    } catch (error) {
      console.error("Error in imageTrackerPlugin (update):", error);
      next();
    }
  };

  schema.pre("findOneAndUpdate", handleUpdate);
  schema.pre("updateOne", handleUpdate);
  schema.pre("updateMany", handleUpdate);
}
