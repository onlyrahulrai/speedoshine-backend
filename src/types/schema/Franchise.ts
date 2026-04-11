export interface BasicDetailsRequest {
    proprietorName: string;
    contactNumber: string;
    email?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    pincode?: string;
}

export interface BusinessDetailsRequest {
    preferredLocation?: string;
    investmentCapacity?: string;
    isFullOwner?: boolean;
    availableSpace?: number;
    preferredModel?: "COCO" | "FOCO" | "FOFO";
    expectedTimeToStart?: string;
    businessExperience?: boolean;
    outletDetails?: string;
    businessType?: "Individual" | "Firm" | "Company";
    panNumber?: string;
    gstNumber?: string;
    sapCode?: string;
    retailOutletDetails?: string;
    whyFranchise?: string;
    remarks?: string;
    totalFranchiseFee?: number;
}

export interface VerificationDetailsRequest {
    kycVerified?: boolean;
    panVerified?: boolean;
    aadhaarVerified?: boolean;
    bankVerified?: boolean;
    agreementSigned?: boolean;
    termsAccepted?: boolean;
}

export interface ApplyFranchiseRequest {
    franchiseId?: string;
    basicDetails?: BasicDetailsRequest;
    businessDetails?: BusinessDetailsRequest;
    verification?: VerificationDetailsRequest;
    source?: string;
}

export interface FranchiseResponse {
    _id: string;
    franchiseId: string;
    applicant: string;
    status: string;
    basicDetails?: BasicDetailsRequest;
    businessDetails?: BusinessDetailsRequest;
    verification?: VerificationDetailsRequest;
    createdAt: string;
    updatedAt: string;
}
