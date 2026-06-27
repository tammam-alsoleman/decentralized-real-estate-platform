package main

const (
	StatusPendingExternalApprovals = "PENDING_EXTERNAL_APPROVALS"
	StatusRejectedByRegistry       = "REJECTED_BY_REGISTRY"
	StatusRejectedByNotary         = "REJECTED_BY_NOTARY"
	StatusConfirmed                = "CONFIRMED"

	ContractTypeSale = "SALE"
	ContractTypeRent = "RENT"

	PlatformMSP = "PlatformMSP"
	RegistryMSP = "RegistryMSP"
	NotaryMSP   = "NotaryMSP"

	ContractStatusChangedEvent = "ContractStatusChanged"

	EventContractSubmitted          = "CONTRACT_SUBMITTED"
	EventContractApprovedByRegistry = "CONTRACT_APPROVED_BY_REGISTRY"
	EventContractRejectedByRegistry = "CONTRACT_REJECTED_BY_REGISTRY"
	EventContractApprovedByNotary   = "CONTRACT_APPROVED_BY_NOTARY"
	EventContractRejectedByNotary   = "CONTRACT_REJECTED_BY_NOTARY"
	EventContractConfirmed          = "CONTRACT_CONFIRMED"
)

type SubmitContractInput struct {
	TransactionId         string `json:"transactionId"`
	ContractType          string `json:"contractType"`
	PropertyId            string `json:"propertyId"`
	RegistryNumber        string `json:"registryNumber"`
	PropertyType          string `json:"propertyType"`
	Location              string `json:"location"`
	Area                  string `json:"area"`
	OwnershipDocumentHash string `json:"ownershipDocumentHash"`
	OwnershipDocumentCid  string `json:"ownershipDocumentCid"`
	ContractHash          string `json:"contractHash"`
	ContractCid           string `json:"contractCid"`
	AuditPackageHash      string `json:"auditPackageHash"`
	AuditPackageCid       string `json:"auditPackageCid"`
	SignaturesHash        string `json:"signaturesHash"`
	PlatformReference     string `json:"platformReference"`
	PlatformProofHash     string `json:"platformProofHash"`
	OccurredAt            string `json:"occurredAt"`
	SellerUserId          string `json:"sellerUserId"`
	SellerFullName        string `json:"sellerFullName"`
	SellerNationalId      string `json:"sellerNationalId"`
	BuyerUserId           string `json:"buyerUserId"`
	BuyerFullName         string `json:"buyerFullName"`
	BuyerNationalId       string `json:"buyerNationalId"`
	SellerSignedAt        string `json:"sellerSignedAt"`
	BuyerSignedAt         string `json:"buyerSignedAt"`
	Price                 string `json:"price"`
	Currency              string `json:"currency"`
	LandlordUserId        string `json:"landlordUserId"`
	LandlordFullName      string `json:"landlordFullName"`
	LandlordNationalId    string `json:"landlordNationalId"`
	TenantUserId          string `json:"tenantUserId"`
	TenantFullName        string `json:"tenantFullName"`
	TenantNationalId      string `json:"tenantNationalId"`
	LandlordSignedAt      string `json:"landlordSignedAt"`
	TenantSignedAt        string `json:"tenantSignedAt"`
	RentStartDate         string `json:"rentStartDate"`
	RentEndDate           string `json:"rentEndDate"`
	RentAmount            string `json:"rentAmount"`
}

type RegistryDecisionInput struct {
	TransactionId     string `json:"transactionId"`
	RegistryReference string `json:"registryReference"`
	EvidenceHash      string `json:"evidenceHash"`
	EvidenceCid       string `json:"evidenceCid,omitempty"`
	ReasonCode        string `json:"reasonCode,omitempty"`
	ReasonSummary     string `json:"reasonSummary,omitempty"`
	DecisionNotesHash string `json:"decisionNotesHash,omitempty"`
	DecidedAt         string `json:"decidedAt"`
}

type NotaryDecisionInput struct {
	TransactionId     string `json:"transactionId"`
	NotaryReference   string `json:"notaryReference"`
	EvidenceHash      string `json:"evidenceHash"`
	EvidenceCid       string `json:"evidenceCid,omitempty"`
	ReasonCode        string `json:"reasonCode,omitempty"`
	ReasonSummary     string `json:"reasonSummary,omitempty"`
	DecisionNotesHash string `json:"decisionNotesHash,omitempty"`
	DecidedAt         string `json:"decidedAt"`
}

type ContractRecord struct {
	SchemaVersion      string                 `json:"schemaVersion"`
	TransactionId      string                 `json:"transactionId"`
	FabricTxId         string                 `json:"fabricTxId"`
	ContractType       string                 `json:"contractType"`
	Status             string                 `json:"status"`
	Property           PropertyInfo           `json:"property"`
	SaleParties        *SaleParties           `json:"saleParties,omitempty" metadata:",optional"`
	RentParties        *RentParties           `json:"rentParties,omitempty" metadata:",optional"`
	IdentityHashes     IdentityHashes         `json:"identityHashes"`
	ContractHash       string                 `json:"contractHash"`
	ContractCid        string                 `json:"contractCid"`
	AuditPackageHash   string                 `json:"auditPackageHash"`
	AuditPackageCid    string                 `json:"auditPackageCid"`
	SignaturesHash     string                 `json:"signaturesHash"`
	OccurredAt         string                 `json:"occurredAt"`
	PlatformSubmission PlatformSubmission     `json:"platformSubmission"`
	RegistryApproval   *InstitutionalDecision `json:"registryApproval,omitempty" metadata:",optional"`
	NotaryApproval     *InstitutionalDecision `json:"notaryApproval,omitempty" metadata:",optional"`
	PayloadHash        string                 `json:"payloadHash"`
	CreatedAt          string                 `json:"createdAt"`
	UpdatedAt          string                 `json:"updatedAt"`
}

type PropertyInfo struct {
	PropertyId            string `json:"propertyId"`
	RegistryNumber        string `json:"registryNumber"`
	PropertyType          string `json:"propertyType"`
	Location              string `json:"location"`
	Area                  string `json:"area"`
	OwnershipDocumentHash string `json:"ownershipDocumentHash"`
	OwnershipDocumentCid  string `json:"ownershipDocumentCid"`
}

type SaleParties struct {
	SellerUserId     string `json:"sellerUserId"`
	SellerFullName   string `json:"sellerFullName"`
	SellerNationalId string `json:"sellerNationalId"`
	BuyerUserId      string `json:"buyerUserId"`
	BuyerFullName    string `json:"buyerFullName"`
	BuyerNationalId  string `json:"buyerNationalId"`
	SellerSignedAt   string `json:"sellerSignedAt"`
	BuyerSignedAt    string `json:"buyerSignedAt"`
	Price            string `json:"price"`
	Currency         string `json:"currency"`
}

type RentParties struct {
	LandlordUserId     string `json:"landlordUserId"`
	LandlordFullName   string `json:"landlordFullName"`
	LandlordNationalId string `json:"landlordNationalId"`
	TenantUserId       string `json:"tenantUserId"`
	TenantFullName     string `json:"tenantFullName"`
	TenantNationalId   string `json:"tenantNationalId"`
	LandlordSignedAt   string `json:"landlordSignedAt"`
	TenantSignedAt     string `json:"tenantSignedAt"`
	RentStartDate      string `json:"rentStartDate"`
	RentEndDate        string `json:"rentEndDate"`
	RentAmount         string `json:"rentAmount"`
	Currency           string `json:"currency"`
}

type IdentityHashes struct {
	SellerFullNameHash     string `json:"sellerFullNameHash,omitempty" metadata:",optional"`
	SellerNationalIdHash   string `json:"sellerNationalIdHash,omitempty" metadata:",optional"`
	BuyerFullNameHash      string `json:"buyerFullNameHash,omitempty" metadata:",optional"`
	BuyerNationalIdHash    string `json:"buyerNationalIdHash,omitempty" metadata:",optional"`
	LandlordFullNameHash   string `json:"landlordFullNameHash,omitempty" metadata:",optional"`
	LandlordNationalIdHash string `json:"landlordNationalIdHash,omitempty" metadata:",optional"`
	TenantFullNameHash     string `json:"tenantFullNameHash,omitempty" metadata:",optional"`
	TenantNationalIdHash   string `json:"tenantNationalIdHash,omitempty" metadata:",optional"`
}

type PlatformSubmission struct {
	SubmittedByMsp    string `json:"submittedByMsp"`
	PlatformReference string `json:"platformReference"`
	PlatformProofHash string `json:"platformProofHash"`
	SignaturesHash    string `json:"signaturesHash"`
	SellerSignedAt    string `json:"sellerSignedAt,omitempty" metadata:",optional"`
	BuyerSignedAt     string `json:"buyerSignedAt,omitempty" metadata:",optional"`
	LandlordSignedAt  string `json:"landlordSignedAt,omitempty" metadata:",optional"`
	TenantSignedAt    string `json:"tenantSignedAt,omitempty" metadata:",optional"`
	SubmittedAt       string `json:"submittedAt"`
	FabricTxId        string `json:"fabricTxId"`
}

type InstitutionalDecision struct {
	Approved            bool   `json:"approved"`
	ApprovedByMsp       string `json:"approvedByMsp"`
	Reference           string `json:"reference"`
	EvidenceHash        string `json:"evidenceHash"`
	EvidenceCid         string `json:"evidenceCid,omitempty" metadata:",optional"`
	ReasonCode          string `json:"reasonCode,omitempty" metadata:",optional"`
	ReasonSummary       string `json:"reasonSummary,omitempty" metadata:",optional"`
	DecisionNotesHash   string `json:"decisionNotesHash,omitempty" metadata:",optional"`
	DecidedAt           string `json:"decidedAt"`
	FabricTxId          string `json:"fabricTxId"`
	DecisionPayloadHash string `json:"decisionPayloadHash"`
}

type ContractEventPayload struct {
	EventType     string `json:"eventType"`
	TransactionId string `json:"transactionId"`
	ContractType  string `json:"contractType"`
	Status        string `json:"status"`
	ActorMsp      string `json:"actorMsp"`
	Reference     string `json:"reference,omitempty" metadata:",optional"`
	ReasonCode    string `json:"reasonCode,omitempty" metadata:",optional"`
	ReasonSummary string `json:"reasonSummary,omitempty" metadata:",optional"`
	EvidenceHash  string `json:"evidenceHash,omitempty" metadata:",optional"`
	EvidenceCid   string `json:"evidenceCid,omitempty" metadata:",optional"`
	DecidedAt     string `json:"decidedAt,omitempty" metadata:",optional"`
	FabricTxId    string `json:"fabricTxId"`
	EmittedAt     string `json:"emittedAt"`
}

type HistoryRecord struct {
	TxId      string          `json:"txId"`
	Timestamp string          `json:"timestamp"`
	IsDelete  bool            `json:"isDelete"`
	Value     *ContractRecord `json:"value,omitempty" metadata:",optional"`
}
