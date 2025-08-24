import { validateString } from "./common";

export const validateManageAssessment = (values: any) => {
  let errors: Record<string, string> = {};

  validateString(errors, values, "title", {
    required: true,
  });
  validateString(errors, values, "description", {
    required: true,
  });

  return errors;
};
