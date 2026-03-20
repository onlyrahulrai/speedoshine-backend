import { validateString } from "./common";

export const validateManageTestimonials = (values: any) => {
    let errors: Record<string, string> = {};

    validateString(errors, values, "name", { required: true });
    validateString(errors, values, "roleOrAge", { required: true });
    validateString(errors, values, "message", { required: true });
    validateString(errors, values, "type", { required: true });
    validateString(errors, values, "rating", { required: true });

    // 🔹 Published validation
    if (values.published !== undefined && typeof values.published !== "boolean") {
        errors.published = "Published must be a boolean";
    }

    return errors;
};