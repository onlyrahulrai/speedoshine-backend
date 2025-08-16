import { phoneVerify, validateEmail, validateString } from "./common";
import User from "../../models/User";

export const validateRegister = async (values: any) => {
  let errors: Record<string, string> = {};

  // Custom email, string validators
  errors = validateEmail(errors, values);
  validateString(errors, values, "firstName", { required: true });
  validateString(errors, values, "lastName", { required: true });
  validateString(errors, values, "age", { required: true });
  validateString(errors, values, "password", { required: true, minLength: 6 });
  validateString(errors, values, "confirmPassword", {
    field: "Confirm Password",
    required: true,
    minLength: 6,
  });

  if (
    values.password &&
    values.confirmPassword &&
    values.password !== values.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }

  const existingUser = await User.findOne({
    email: values.email,
  });

  if (existingUser) {
    errors.email = "This email is already in use";
  }

  return errors;
};

export const validateLogin = async (values: any) => {
  let errors: Record<string, string> = {};

  // Custom email, string validators
  errors = validateEmail(errors, values);
  validateString(errors, values, "password", { required: true, minLength: 6 });

  return errors;
};

export const validateRequestResetPassword = (values: any) => {
  let errors = validateEmail({}, values);

  return errors;
};

export const validateRequestResetPasswordConfirm = (values: any) => {
  let errors = validateString({}, values, "newPassword", {
    required: true,
    minLength: 6,
  });
  validateString(errors, values, "confirmPassword", {
    required: true,
    minLength: 6,
  });

  if (
    values.password &&
    values.confirmPassword &&
    values.password !== values.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};

export const validateEditProfile = (values: any) => {
  let errors = validateEmail({}, values);
  validateString(errors, values, "name", { required: true });

  if (values.phone?.trim()) {
    phoneVerify(errors, values);
  }

  return errors;
};

export const validateChangePassword = async (values: any, id: number) => {
  let errors = validateString({}, values, "oldPassword", {
    required: true,
    minLength: 6,
  });
  validateString(errors, values, "newPassword", {
    required: true,
    minLength: 6,
  });
  validateString(errors, values, "confirmPassword", {
    required: true,
    minLength: 6,
  });

  if (
    values.newPassword &&
    values.confirmPassword &&
    values.newPassword !== values.confirmPassword
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length === 0) {
    // const user = await prisma.user.findUnique({ where: { id } });
    // const isMatch = await bcrypt.compare(values.oldPassword, user.password);
    // if (!isMatch) {
    //   errors.oldPassword = "Old password is incorrect";
    // }
  }

  return errors;
};
