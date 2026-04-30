import Franchise from "../models/Franchise/Franchise";
import { ApplyFranchiseRequest } from "../types/schema/Franchise";

export const saveFranchiseApplicationStep = async (
    userId: string,
    step: "BASIC" | "BUSINESS" | "BANK_DETAILS" | "VERIFICATION",
    data: ApplyFranchiseRequest,
    options: { source?: "SELF_SIGNUP" | "ADMIN_PANEL"; role?: "USER" | "ADMIN" } = { source: "SELF_SIGNUP", role: "USER" }
) => {
    try {
        const { franchiseId, basicDetails, businessDetails, verification, bankDetails } = data;

        // STEP 1: BASIC (Create or Update)
        if (step === "BASIC") {
            if (!franchiseId) {
                // Create new application draft
                const newFranchise = new Franchise({
                    applicant: userId,
                    owner: userId, // Initially owner is applicant
                    applicantRole: options.role || "USER",
                    source: options.source || "SELF_SIGNUP",
                    status: "DRAFT",
                    basicDetails: basicDetails || {},
                });

                return await newFranchise.save();
            } else {
                // Update existing draft's basic details
                // No need for strict applicant check only if admin
                const filter: any = { franchiseId, isDeleted: false };
                if (options.role !== "ADMIN") filter.applicant = userId;

                const application = await Franchise.findOne(filter);

                if (!application) {
                    throw new Error("Franchise application not found or unauthorized");
                }

                application.basicDetails = { ...application.basicDetails, ...basicDetails };
                return await application.save();
            }
        }

        // STEPS 2, 3 & 4: BUSINESS, BANK_DETAILS, and VERIFICATION
        if (!franchiseId) {
            throw new Error("Franchise ID is required to progress application");
        }

        const filter: any = { franchiseId, isDeleted: false };
        if (options.role !== "ADMIN") filter.applicant = userId;

        const application = await Franchise.findOne(filter);

        if (!application) {
            throw new Error("Franchise application not found or unauthorized");
        }

        if (step === "BUSINESS" && businessDetails) {
            application.businessDetails = { ...application.businessDetails, ...businessDetails };
        } else if (step === "BANK_DETAILS" && bankDetails) {
            application.bankDetails = { ...application.bankDetails, ...bankDetails };
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
        if (error.name === "CastError") throw new Error("Invalid format provided");
        if (error.code === 11000) throw new Error("Duplicate entry. A franchise with this unique field already exists.");
        throw new Error(error.message || "Failed to save franchise application");
    }
};

/**
 * Retrieves all franchise applications. If not an admin, retrieves only those associated with the specific user.
 */
export const getFranchiseApplications = async (userId: string, isAdmin: boolean = false, filters: { status?: string; page?: string; limit?: string } = {}) => {
    try {
        const query: any = { isDeleted: false };

        if (!isAdmin) {
            query.applicant = userId;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        const page = parseInt(filters.page || "1");
        const limit = parseInt(filters.limit || "10");
        const skip = (page - 1) * limit;

        const total = await Franchise.countDocuments(query);

        const results = await Franchise.find(query).select("-__v").skip(skip).limit(limit).sort({ updatedAt: -1 }).lean();

        return {
            page,
            limit,
            total,
            has_next: skip + results.length < total,
            has_prev: page > 1,
            results
        }
    } catch (error) {
        throw new Error("Failed to retrieve applications");
    }
};

/**
 * Retrieves the full detail of a specific franchise application for the Dossier view.
 */
export const getFranchiseApplicationById = async (_id: string, userId: string, isAdmin: boolean = false) => {
    try {
        const query: any = { _id, isDeleted: false };

        if (!isAdmin) {
            query.applicant = userId;
        }

        const application = await Franchise.findOne(query);

        if (!application) {
            throw new Error("Application not found or unauthorized access to dossier");
        }

        return application;
    } catch (error: any) {
        throw new Error(error.message || "Failed to retrieve application details");
    }
};
