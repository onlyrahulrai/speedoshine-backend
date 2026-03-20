import User from "../../models/User";
import { validateEmail, validatePhone, validateString } from "./common";

export const validateManageUser = async (values: Record<string, any>, id: string = "") => {
    let errors = validateEmail({}, values);
    validatePhone(errors, values);
    validateString(errors, values, "name", { required: true });
    validateString(errors, values, "password", { required: true, minLength: 6 });

    let query: Record<string, any> = {};

    if (id) {
        query._id = { $ne: id };
    }

    const existingEmailUser = await User.findOne({
        email: values.email,
        ...query
    });

    const existingPhoneUser = await User.findOne({
        phone: values.phone,
        ...query
    });

    if (existingEmailUser) {
        errors.email = "Email already exists";
    }

    if (existingPhoneUser) {
        errors.phone = "Phone number already exists";
    }

    return errors;
};