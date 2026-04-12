import Franchise from "../models/Franchise/Franchise";
import { ApplyFranchiseRequest } from "../types/schema/Franchise";

export const saveFranchiseApplicationStep = async (
    userId: string,
    step: "BASIC" | "BUSINESS" | "VERIFICATION",
    data: ApplyFranchiseRequest
) => {
    try {
        const { franchiseId, basicDetails, businessDetails, verification } = data;

        // STEP 1: BASIC (Create or Update)
        if (step === "BASIC") {
            if (!franchiseId) {
                // Create new application draft
                const newFranchise = new Franchise({
                    applicant: userId,
                    owner: userId, // Assuming applicant is the owner initially
                    applicantRole: "USER", // Default role for self signup
                    source: "SELF_SIGNUP",
                    status: "DRAFT",
                    basicDetails: basicDetails || {},
                });

                return await newFranchise.save();
            } else {
                // Update existing draft's basic details
                const application = await Franchise.findOne({
                    franchiseId: franchiseId,
                    applicant: userId,
                    isDeleted: false,
                });

                if (!application) {
                    throw new Error("Franchise application not found or unauthorized");
                }

                application.basicDetails = { ...application.basicDetails, ...basicDetails };
                return await application.save();
            }
        }

        // STEPS 2 & 3: BUSINESS and VERIFICATION (Requires franchiseId)
        if (!franchiseId) {
            throw new Error("Franchise ID is required to progress application");
        }

        const application = await Franchise.findOne({
            franchiseId: franchiseId,
            applicant: userId,
            isDeleted: false,
        });

        if (!application) {
            throw new Error("Franchise application not found or unauthorized");
        }

        if (step === "BUSINESS" && businessDetails) {
            application.businessDetails = { ...application.businessDetails, ...businessDetails };
        } else if (step === "VERIFICATION" && verification) {
            application.verification = { ...application.verification, ...verification };

            // Move forward if terms are accepted
            if (verification.termsAccepted) {
                application.status = "SUBMITTED";
            }
        } else {
            throw new Error(`Invalid or incomplete data provided for step: ${step}`);
        }

        return await application.save();
    } catch (error: any) {
        console.log("Error: ", error);

        if (error.name === "CastError") {
            throw new Error("Invalid format provided");
        }
        // Differentiate custom errors from unhandled mongoose errors
        if (error.code === 11000) {
            throw new Error("Duplicate entry. A franchise with this unique field already exists.");
        }

        throw new Error(error.message || "Failed to save franchise application");
    }
};

