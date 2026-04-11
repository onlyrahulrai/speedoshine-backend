import { ApplyFranchiseRequest } from "../../types/schema/Franchise";

export const validateApplyFranchiseStep = (
    step: "BASIC" | "BUSINESS" | "VERIFICATION",
    body: ApplyFranchiseRequest
): Record<string, string> => {
    const fields: Record<string, string> = {};

    if (!step) {
        fields.step = "Step is required";
        return fields;
    }

    if (step === "BASIC") {
        if (!body.basicDetails?.proprietorName?.trim()) {
            fields["basicDetails.proprietorName"] = "Proprietor Name is required";
        }
        if (!body.basicDetails?.contactNumber?.trim()) {
            fields["basicDetails.contactNumber"] = "Contact Number is required";
        }
    }

    if (step === "BUSINESS") {
        if (!body.franchiseId) {
            fields.franchiseId = "Franchise ID is required for updating business details";
        }

        if (body.businessDetails?.panNumber && body.businessDetails.panNumber.length !== 10) {
            // Just a simple example validation
            fields["businessDetails.panNumber"] = "Invalid PAN number format";
        }
    }

    if (step === "VERIFICATION") {
        if (!body.franchiseId) {
            fields.franchiseId = "Franchise ID is required for verification step";
        }

        if (!body.verification?.panCardDoc) {
            fields["verification.panCardDoc"] = "PAN Card document is required";
        }

        if (!body.verification?.aadhaarCardDoc) {
            fields["verification.aadhaarCardDoc"] = "Aadhaar Card document is required";
        }

        if (!body.verification?.bankDetailsDoc) {
            fields["verification.bankDetailsDoc"] = "Bank Details document is required";
        }

        if (body.verification?.termsAccepted !== true) {
            fields["verification.termsAccepted"] = "Please accept the terms and conditions";
        }
    }

    return fields;
};
