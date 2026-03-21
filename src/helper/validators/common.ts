type ValidationOptions = {
  field?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
  pattern?: RegExp;
};

export const validateString = (
  errors: Record<string, string>,
  values: Record<string, any>,
  fieldName: string,
  options: ValidationOptions = {}
): Record<string, string> => {
  const {
    field = null,
    required = false,
    minLength = 0,
    maxLength = Infinity,
    trim = true,
    pattern = null,
  } = options;

  let value = values[fieldName];

  if (trim && typeof value === "string") {
    value = value.trim();
  }

  // Required check
  if (required && (!value || value.length === 0)) {
    errors[fieldName] = `This field is required!`;
    return errors;
  }

  // Skip further checks if value is empty and not required
  if (!value) return errors;

  // Min length
  if (minLength && value.length < minLength) {
    errors[fieldName] = `This must be at least ${minLength} characters long.`;
  }

  // Max length
  if (maxLength && value.length > maxLength) {
    errors[fieldName] = `This must not exceed ${maxLength} characters.`;
  }

  // Pattern match
  if (pattern && !pattern.test(value)) {
    errors[fieldName] = `This contains invalid characters.`;
  }

  return errors;
};

export const validateEmail = (
  errors: Record<string, string> = {},
  values: Record<string, any>
): Record<string, string> => {
  const email = values.email;

  if (!email) {
    errors.email = "This field is required!";
  } else if (typeof email === "string" && email.includes(" ")) {
    errors.email = "Wrong Email...!";
  } else if (
    typeof email === "string" &&
    !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)
  ) {
    errors.email = "Invalid email address...!";
  }

  return errors;
};

export const validatePhone = (
  errors: { [key: string]: any },
  values: { [key: string]: string }
) => {
  const regexPattern = /^(\+91[\-\s]?)?[6789]\d{2}[\-\s]?\d{3}[\-\s]?\d{4}$/;

  const phone = values.phone?.trim();

  if (!phone) {
    errors.phone = "This field is required!";
  } else if (!regexPattern.test(phone)) {
    errors.phone = "This isn't valid!";
  }

  return errors;
};
