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
    aadhaarNumber?: string;
}

export interface BusinessDetailsRequest {
    preferredLocation?: string;
    investmentCapacity?: string;
    isFullOwner?: boolean;
    availableSpace?: number;
    preferredModel?: "COCO" | "FOCO" | "FOFO";
    expectedTimeline?: string;
    businessExperience?: boolean;
    businessType?: "Individual" | "Firm" | "Company";
    experienceDescription?: string;
    outletDetails?: string;
    panNumber?: string;
    gstNumber?: string;
    sapCode?: string;
    whyFranchise?: string;
    remarks?: string;
    totalFranchiseFee?: number;
}

export interface BankDetailsRequest {
    accountNumber?: string;
    ifsc?: string;
    bookingFeeAmount?: number;
    bookingFeeStatus?: "Paid" | "Pending" | "Failed" | "Partial";
    paymentMode?: string;
    transactionNumber?: string;
}

export interface VerificationDetailsRequest {
    kycVerified?: boolean;
    kycDetails?: {
        panVerified?: boolean;
        aadhaarVerified?: boolean;
        bankVerified?: boolean;
    };
    agreementSigned?: boolean;
    termsAccepted?: boolean;
}

export interface ApplyFranchiseRequest {
    franchiseId?: string;
    basicDetails?: BasicDetailsRequest;
    businessDetails?: BusinessDetailsRequest;
    bankDetails?: BankDetailsRequest;
    verification?: VerificationDetailsRequest;
}

export interface FranchiseResponse {
    _id: string;
    franchiseId: string;
    applicant: string;
    status: string;
    basicDetails?: BasicDetailsRequest;
    businessDetails?: BusinessDetailsRequest;
    bankDetails?: BankDetailsRequest;
    verification?: VerificationDetailsRequest;
    createdAt: string;
    updatedAt: string;
}
