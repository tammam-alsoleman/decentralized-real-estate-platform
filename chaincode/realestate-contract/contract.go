package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
	contractapi.Contract
}

func (s *SmartContract) SubmitContract(ctx contractapi.TransactionContextInterface, inputJSON string) (*ContractRecord, error) {
	if err := requireMSP(ctx, PlatformMSP); err != nil {
		return nil, err
	}

	input := SubmitContractInput{}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return nil, fmt.Errorf("invalid submit input JSON: %w", err)
	}
	input.normalize()

	if err := validateSubmitInput(input); err != nil {
		return nil, err
	}

	payloadHash, err := hashStructDeterministic(input)
	if err != nil {
		return nil, err
	}

	existing, err := getRecord(ctx, input.TransactionId)
	if err == nil {
		if existing.PayloadHash == payloadHash {
			return existing, nil
		}
		return nil, fmt.Errorf("contract %s already exists with a different payload hash", input.TransactionId)
	}
	if !errors.Is(err, ErrContractNotFound) {
		return nil, err
	}

	now, err := txTimestampRFC3339(ctx)
	if err != nil {
		return nil, err
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to read client MSP ID: %w", err)
	}

	record := &ContractRecord{
		SchemaVersion: "1.0",
		TransactionId: input.TransactionId,
		FabricTxId:    ctx.GetStub().GetTxID(),
		ContractType:  input.ContractType,
		Status:        StatusPendingExternalApprovals,
		Property: PropertyInfo{
			PropertyId:            input.PropertyId,
			RegistryNumber:        input.RegistryNumber,
			PropertyType:          input.PropertyType,
			Location:              input.Location,
			Area:                  input.Area,
			OwnershipDocumentHash: input.OwnershipDocumentHash,
			OwnershipDocumentCid:  input.OwnershipDocumentCid,
		},
		ContractHash:     input.ContractHash,
		ContractCid:      input.ContractCid,
		AuditPackageHash: input.AuditPackageHash,
		AuditPackageCid:  input.AuditPackageCid,
		SignaturesHash:   input.SignaturesHash,
		OccurredAt:       input.OccurredAt,
		PayloadHash:      payloadHash,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	record.PlatformSubmission = PlatformSubmission{
		SubmittedByMsp:    mspID,
		PlatformReference: input.PlatformReference,
		PlatformProofHash: input.PlatformProofHash,
		SignaturesHash:    input.SignaturesHash,
		SubmittedAt:       now,
		FabricTxId:        record.FabricTxId,
	}

	if input.ContractType == ContractTypeSale {
		record.SaleParties = &SaleParties{
			SellerUserId:     input.SellerUserId,
			SellerFullName:   input.SellerFullName,
			SellerNationalId: input.SellerNationalId,
			BuyerUserId:      input.BuyerUserId,
			BuyerFullName:    input.BuyerFullName,
			BuyerNationalId:  input.BuyerNationalId,
			SellerSignedAt:   input.SellerSignedAt,
			BuyerSignedAt:    input.BuyerSignedAt,
			Price:            input.Price,
			Currency:         input.Currency,
		}
		record.IdentityHashes = IdentityHashes{
			"sellerFullNameHash":   hashString(input.SellerFullName),
			"sellerNationalIdHash": hashString(input.SellerNationalId),
			"buyerFullNameHash":    hashString(input.BuyerFullName),
			"buyerNationalIdHash":  hashString(input.BuyerNationalId),
		}
		record.PlatformSubmission.SellerSignedAt = input.SellerSignedAt
		record.PlatformSubmission.BuyerSignedAt = input.BuyerSignedAt
	}

	if input.ContractType == ContractTypeRent {
		record.RentParties = &RentParties{
			LandlordUserId:     input.LandlordUserId,
			LandlordFullName:   input.LandlordFullName,
			LandlordNationalId: input.LandlordNationalId,
			TenantUserId:       input.TenantUserId,
			TenantFullName:     input.TenantFullName,
			TenantNationalId:   input.TenantNationalId,
			LandlordSignedAt:   input.LandlordSignedAt,
			TenantSignedAt:     input.TenantSignedAt,
			RentStartDate:      input.RentStartDate,
			RentEndDate:        input.RentEndDate,
			RentAmount:         input.RentAmount,
			Currency:           input.Currency,
		}
		record.IdentityHashes = IdentityHashes{
			"landlordFullNameHash":   hashString(input.LandlordFullName),
			"landlordNationalIdHash": hashString(input.LandlordNationalId),
			"tenantFullNameHash":     hashString(input.TenantFullName),
			"tenantNationalIdHash":   hashString(input.TenantNationalId),
		}
		record.PlatformSubmission.LandlordSignedAt = input.LandlordSignedAt
		record.PlatformSubmission.TenantSignedAt = input.TenantSignedAt
	}

	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractSubmitted, PlatformMSP, nil); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *SmartContract) ApproveByRegistry(ctx contractapi.TransactionContextInterface, inputJSON string) (*ContractRecord, error) {
	if err := requireMSP(ctx, RegistryMSP); err != nil {
		return nil, err
	}

	input, err := parseRegistryDecisionInput(inputJSON)
	if err != nil {
		return nil, err
	}
	if err := validateRegistryDecisionInput(input, false); err != nil {
		return nil, err
	}

	payloadHash, err := hashStructDeterministic(input)
	if err != nil {
		return nil, err
	}

	record, err := getRecord(ctx, input.TransactionId)
	if err != nil {
		return nil, err
	}
	if record.RegistryApproval != nil {
		if record.RegistryApproval.Approved && record.RegistryApproval.DecisionPayloadHash == payloadHash {
			return record, nil
		}
		return nil, errors.New("registry decision already exists with different data")
	}
	if record.Status != StatusPendingExternalApprovals {
		return nil, fmt.Errorf("registry approval requires status %s", StatusPendingExternalApprovals)
	}

	if err := applyRegistryDecision(ctx, record, input, true, payloadHash); err != nil {
		return nil, err
	}
	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractApprovedByRegistry, RegistryMSP, record.RegistryApproval); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *SmartContract) RejectByRegistry(ctx contractapi.TransactionContextInterface, inputJSON string) (*ContractRecord, error) {
	if err := requireMSP(ctx, RegistryMSP); err != nil {
		return nil, err
	}

	input, err := parseRegistryDecisionInput(inputJSON)
	if err != nil {
		return nil, err
	}
	if err := validateRegistryDecisionInput(input, true); err != nil {
		return nil, err
	}

	payloadHash, err := hashStructDeterministic(input)
	if err != nil {
		return nil, err
	}

	record, err := getRecord(ctx, input.TransactionId)
	if err != nil {
		return nil, err
	}
	if record.RegistryApproval != nil {
		if !record.RegistryApproval.Approved && record.RegistryApproval.DecisionPayloadHash == payloadHash {
			return record, nil
		}
		return nil, errors.New("registry decision already exists with different data")
	}
	if record.Status == StatusConfirmed {
		return nil, errors.New("confirmed contract cannot be rejected by registry")
	}
	if record.Status != StatusPendingExternalApprovals {
		return nil, fmt.Errorf("registry rejection requires status %s", StatusPendingExternalApprovals)
	}

	if err := applyRegistryDecision(ctx, record, input, false, payloadHash); err != nil {
		return nil, err
	}
	record.Status = StatusRejectedByRegistry
	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractRejectedByRegistry, RegistryMSP, record.RegistryApproval); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *SmartContract) ApproveByNotary(ctx contractapi.TransactionContextInterface, inputJSON string) (*ContractRecord, error) {
	if err := requireMSP(ctx, NotaryMSP); err != nil {
		return nil, err
	}

	input, err := parseNotaryDecisionInput(inputJSON)
	if err != nil {
		return nil, err
	}
	if err := validateNotaryDecisionInput(input, false); err != nil {
		return nil, err
	}

	payloadHash, err := hashStructDeterministic(input)
	if err != nil {
		return nil, err
	}

	record, err := getRecord(ctx, input.TransactionId)
	if err != nil {
		return nil, err
	}
	if record.NotaryApproval != nil {
		if record.NotaryApproval.Approved && record.NotaryApproval.DecisionPayloadHash == payloadHash {
			return record, nil
		}
		return nil, errors.New("notary decision already exists with different data")
	}
	if record.Status != StatusPendingExternalApprovals {
		return nil, fmt.Errorf("notary approval requires status %s", StatusPendingExternalApprovals)
	}

	if err := applyNotaryDecision(ctx, record, input, true, payloadHash); err != nil {
		return nil, err
	}
	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractApprovedByNotary, NotaryMSP, record.NotaryApproval); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *SmartContract) RejectByNotary(ctx contractapi.TransactionContextInterface, inputJSON string) (*ContractRecord, error) {
	if err := requireMSP(ctx, NotaryMSP); err != nil {
		return nil, err
	}

	input, err := parseNotaryDecisionInput(inputJSON)
	if err != nil {
		return nil, err
	}
	if err := validateNotaryDecisionInput(input, true); err != nil {
		return nil, err
	}

	payloadHash, err := hashStructDeterministic(input)
	if err != nil {
		return nil, err
	}

	record, err := getRecord(ctx, input.TransactionId)
	if err != nil {
		return nil, err
	}
	if record.NotaryApproval != nil {
		if !record.NotaryApproval.Approved && record.NotaryApproval.DecisionPayloadHash == payloadHash {
			return record, nil
		}
		return nil, errors.New("notary decision already exists with different data")
	}
	if record.Status == StatusConfirmed {
		return nil, errors.New("confirmed contract cannot be rejected by notary")
	}
	if record.Status != StatusPendingExternalApprovals {
		return nil, fmt.Errorf("notary rejection requires status %s", StatusPendingExternalApprovals)
	}

	if err := applyNotaryDecision(ctx, record, input, false, payloadHash); err != nil {
		return nil, err
	}
	record.Status = StatusRejectedByNotary
	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractRejectedByNotary, NotaryMSP, record.NotaryApproval); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *SmartContract) ConfirmContract(ctx contractapi.TransactionContextInterface, transactionId string) (*ContractRecord, error) {
	if err := requireMSP(ctx, PlatformMSP); err != nil {
		return nil, err
	}

	transactionId = normalizeString(transactionId)
	record, err := getRecord(ctx, transactionId)
	if err != nil {
		return nil, err
	}
	if record.Status == StatusConfirmed {
		return record, nil
	}
	if record.Status == StatusRejectedByRegistry || record.Status == StatusRejectedByNotary {
		return nil, errors.New("rejected contract cannot be confirmed")
	}
	if record.RegistryApproval == nil || !record.RegistryApproval.Approved {
		return nil, errors.New("registry approval is required before confirmation")
	}
	if record.NotaryApproval == nil || !record.NotaryApproval.Approved {
		return nil, errors.New("notary approval is required before confirmation")
	}

	if err := touchRecord(ctx, record); err != nil {
		return nil, err
	}
	record.Status = StatusConfirmed
	if err := putRecord(ctx, record); err != nil {
		return nil, err
	}
	if err := emitContractEvent(ctx, record, EventContractConfirmed, PlatformMSP, nil); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *SmartContract) GetContractByTxId(ctx contractapi.TransactionContextInterface, transactionId string) (*ContractRecord, error) {
	return getRecord(ctx, normalizeString(transactionId))
}

func (s *SmartContract) GetContractHistory(ctx contractapi.TransactionContextInterface, transactionId string) ([]HistoryRecord, error) {
	transactionId = normalizeString(transactionId)
	if transactionId == "" {
		return nil, errors.New("transactionId is required")
	}

	iterator, err := ctx.GetStub().GetHistoryForKey(contractKey(transactionId))
	if err != nil {
		return nil, fmt.Errorf("failed to get contract history: %w", err)
	}
	defer iterator.Close()

	records := []HistoryRecord{}
	for iterator.HasNext() {
		item, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to read contract history item: %w", err)
		}

		timestamp := time.Unix(item.Timestamp.Seconds, int64(item.Timestamp.Nanos)).UTC().Format(time.RFC3339)
		history := HistoryRecord{
			TxId:      item.TxId,
			Timestamp: timestamp,
			IsDelete:  item.IsDelete,
		}
		if len(item.Value) > 0 {
			value := ContractRecord{}
			if err := json.Unmarshal(item.Value, &value); err != nil {
				return nil, fmt.Errorf("failed to decode history value: %w", err)
			}
			history.Value = &value
		}
		records = append(records, history)
	}

	return records, nil
}

var ErrContractNotFound = errors.New("contract not found")

func contractKey(transactionId string) string {
	return "contract:" + transactionId
}

func txTimestampRFC3339(ctx contractapi.TransactionContextInterface) (string, error) {
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %w", err)
	}
	return time.Unix(timestamp.Seconds, int64(timestamp.Nanos)).UTC().Format(time.RFC3339), nil
}

func requireMSP(ctx contractapi.TransactionContextInterface, expectedMSP string) error {
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to read client MSP ID: %w", err)
	}
	if mspID != expectedMSP {
		return fmt.Errorf("operation requires %s identity", expectedMSP)
	}
	return nil
}

func normalizeString(value string) string {
	return strings.TrimSpace(value)
}

func hashString(value string) string {
	sum := sha256.Sum256([]byte(normalizeString(value)))
	return hex.EncodeToString(sum[:])
}

func hashStructDeterministic(value any) (string, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("failed to marshal deterministic hash payload: %w", err)
	}
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:]), nil
}

func getRecord(ctx contractapi.TransactionContextInterface, transactionId string) (*ContractRecord, error) {
	if transactionId == "" {
		return nil, errors.New("transactionId is required")
	}
	bytes, err := ctx.GetStub().GetState(contractKey(transactionId))
	if err != nil {
		return nil, fmt.Errorf("failed to read contract %s: %w", transactionId, err)
	}
	if len(bytes) == 0 {
		return nil, ErrContractNotFound
	}

	record := ContractRecord{}
	if err := json.Unmarshal(bytes, &record); err != nil {
		return nil, fmt.Errorf("failed to decode contract %s: %w", transactionId, err)
	}
	return &record, nil
}

func putRecord(ctx contractapi.TransactionContextInterface, record *ContractRecord) error {
	bytes, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to encode contract %s: %w", record.TransactionId, err)
	}
	return ctx.GetStub().PutState(contractKey(record.TransactionId), bytes)
}

func touchRecord(ctx contractapi.TransactionContextInterface, record *ContractRecord) error {
	now, err := txTimestampRFC3339(ctx)
	if err != nil {
		return err
	}
	record.UpdatedAt = now
	record.FabricTxId = ctx.GetStub().GetTxID()
	return nil
}

func emitContractEvent(
	ctx contractapi.TransactionContextInterface,
	record *ContractRecord,
	eventType string,
	actorMsp string,
	decision *InstitutionalDecision,
) error {
	emittedAt, err := txTimestampRFC3339(ctx)
	if err != nil {
		return err
	}

	payload := ContractEventPayload{
		EventType:     eventType,
		TransactionId: record.TransactionId,
		ContractType:  record.ContractType,
		Status:        record.Status,
		ActorMsp:      actorMsp,
		FabricTxId:    ctx.GetStub().GetTxID(),
		EmittedAt:     emittedAt,
	}

	if decision != nil {
		payload.Reference = decision.Reference
		payload.ReasonCode = decision.ReasonCode
		payload.ReasonSummary = decision.ReasonSummary
		payload.EvidenceHash = decision.EvidenceHash
		payload.EvidenceCid = decision.EvidenceCid
		payload.DecidedAt = decision.DecidedAt
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode contract event payload: %w", err)
	}

	return ctx.GetStub().SetEvent(ContractStatusChangedEvent, payloadBytes)
}

func parseRegistryDecisionInput(inputJSON string) (RegistryDecisionInput, error) {
	input := RegistryDecisionInput{}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return input, fmt.Errorf("invalid registry decision input JSON: %w", err)
	}
	input.normalize()
	return input, nil
}

func parseNotaryDecisionInput(inputJSON string) (NotaryDecisionInput, error) {
	input := NotaryDecisionInput{}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return input, fmt.Errorf("invalid notary decision input JSON: %w", err)
	}
	input.normalize()
	return input, nil
}

func applyRegistryDecision(ctx contractapi.TransactionContextInterface, record *ContractRecord, input RegistryDecisionInput, approved bool, payloadHash string) error {
	if err := touchRecord(ctx, record); err != nil {
		return err
	}
	record.RegistryApproval = &InstitutionalDecision{
		Approved:            approved,
		ApprovedByMsp:       RegistryMSP,
		Reference:           input.RegistryReference,
		EvidenceHash:        input.EvidenceHash,
		EvidenceCid:         input.EvidenceCid,
		ReasonCode:          input.ReasonCode,
		ReasonSummary:       input.ReasonSummary,
		DecisionNotesHash:   input.DecisionNotesHash,
		DecidedAt:           input.DecidedAt,
		FabricTxId:          ctx.GetStub().GetTxID(),
		DecisionPayloadHash: payloadHash,
	}
	return nil
}

func applyNotaryDecision(ctx contractapi.TransactionContextInterface, record *ContractRecord, input NotaryDecisionInput, approved bool, payloadHash string) error {
	if err := touchRecord(ctx, record); err != nil {
		return err
	}
	record.NotaryApproval = &InstitutionalDecision{
		Approved:            approved,
		ApprovedByMsp:       NotaryMSP,
		Reference:           input.NotaryReference,
		EvidenceHash:        input.EvidenceHash,
		EvidenceCid:         input.EvidenceCid,
		ReasonCode:          input.ReasonCode,
		ReasonSummary:       input.ReasonSummary,
		DecisionNotesHash:   input.DecisionNotesHash,
		DecidedAt:           input.DecidedAt,
		FabricTxId:          ctx.GetStub().GetTxID(),
		DecisionPayloadHash: payloadHash,
	}
	return nil
}

func validateSubmitInput(input SubmitContractInput) error {
	if err := requireFields(map[string]string{
		"transactionId":         input.TransactionId,
		"contractType":          input.ContractType,
		"propertyId":            input.PropertyId,
		"registryNumber":        input.RegistryNumber,
		"propertyType":          input.PropertyType,
		"location":              input.Location,
		"area":                  input.Area,
		"ownershipDocumentHash": input.OwnershipDocumentHash,
		"ownershipDocumentCid":  input.OwnershipDocumentCid,
		"contractHash":          input.ContractHash,
		"contractCid":           input.ContractCid,
		"auditPackageHash":      input.AuditPackageHash,
		"auditPackageCid":       input.AuditPackageCid,
		"signaturesHash":        input.SignaturesHash,
		"platformReference":     input.PlatformReference,
		"platformProofHash":     input.PlatformProofHash,
		"occurredAt":            input.OccurredAt,
	}); err != nil {
		return err
	}

	if input.ContractType != ContractTypeSale && input.ContractType != ContractTypeRent {
		return errors.New("contractType must be SALE or RENT")
	}

	if input.ContractType == ContractTypeSale {
		if err := requireFields(map[string]string{
			"sellerUserId":     input.SellerUserId,
			"sellerFullName":   input.SellerFullName,
			"sellerNationalId": input.SellerNationalId,
			"buyerUserId":      input.BuyerUserId,
			"buyerFullName":    input.BuyerFullName,
			"buyerNationalId":  input.BuyerNationalId,
			"sellerSignedAt":   input.SellerSignedAt,
			"buyerSignedAt":    input.BuyerSignedAt,
			"price":            input.Price,
			"currency":         input.Currency,
		}); err != nil {
			return err
		}
		return requireEmptyFields("SALE", map[string]string{
			"landlordUserId":     input.LandlordUserId,
			"landlordFullName":   input.LandlordFullName,
			"landlordNationalId": input.LandlordNationalId,
			"tenantUserId":       input.TenantUserId,
			"tenantFullName":     input.TenantFullName,
			"tenantNationalId":   input.TenantNationalId,
			"landlordSignedAt":   input.LandlordSignedAt,
			"tenantSignedAt":     input.TenantSignedAt,
			"rentStartDate":      input.RentStartDate,
			"rentEndDate":        input.RentEndDate,
			"rentAmount":         input.RentAmount,
		})
	}

	if err := requireFields(map[string]string{
		"landlordUserId":     input.LandlordUserId,
		"landlordFullName":   input.LandlordFullName,
		"landlordNationalId": input.LandlordNationalId,
		"tenantUserId":       input.TenantUserId,
		"tenantFullName":     input.TenantFullName,
		"tenantNationalId":   input.TenantNationalId,
		"landlordSignedAt":   input.LandlordSignedAt,
		"tenantSignedAt":     input.TenantSignedAt,
		"rentStartDate":      input.RentStartDate,
		"rentEndDate":        input.RentEndDate,
		"rentAmount":         input.RentAmount,
		"currency":           input.Currency,
	}); err != nil {
		return err
	}
	return requireEmptyFields("RENT", map[string]string{
		"sellerUserId":     input.SellerUserId,
		"sellerFullName":   input.SellerFullName,
		"sellerNationalId": input.SellerNationalId,
		"buyerUserId":      input.BuyerUserId,
		"buyerFullName":    input.BuyerFullName,
		"buyerNationalId":  input.BuyerNationalId,
		"sellerSignedAt":   input.SellerSignedAt,
		"buyerSignedAt":    input.BuyerSignedAt,
		"price":            input.Price,
	})
}

func validateRegistryDecisionInput(input RegistryDecisionInput, requireReason bool) error {
	fields := map[string]string{
		"transactionId":     input.TransactionId,
		"registryReference": input.RegistryReference,
		"evidenceHash":      input.EvidenceHash,
		"decidedAt":         input.DecidedAt,
	}
	if requireReason {
		fields["reasonCode"] = input.ReasonCode
		fields["reasonSummary"] = input.ReasonSummary
	}
	return requireFields(fields)
}

func validateNotaryDecisionInput(input NotaryDecisionInput, requireReason bool) error {
	fields := map[string]string{
		"transactionId":   input.TransactionId,
		"notaryReference": input.NotaryReference,
		"evidenceHash":    input.EvidenceHash,
		"decidedAt":       input.DecidedAt,
	}
	if requireReason {
		fields["reasonCode"] = input.ReasonCode
		fields["reasonSummary"] = input.ReasonSummary
	}
	return requireFields(fields)
}

func requireFields(fields map[string]string) error {
	for name, value := range fields {
		if normalizeString(value) == "" {
			return fmt.Errorf("%s is required", name)
		}
	}
	return nil
}

func requireEmptyFields(contractType string, fields map[string]string) error {
	for name, value := range fields {
		if normalizeString(value) != "" {
			return fmt.Errorf("%s must be empty for %s contracts", name, contractType)
		}
	}
	return nil
}

func (input *SubmitContractInput) normalize() {
	input.TransactionId = normalizeString(input.TransactionId)
	input.ContractType = normalizeString(input.ContractType)
	input.PropertyId = normalizeString(input.PropertyId)
	input.RegistryNumber = normalizeString(input.RegistryNumber)
	input.PropertyType = normalizeString(input.PropertyType)
	input.Location = normalizeString(input.Location)
	input.Area = normalizeString(input.Area)
	input.OwnershipDocumentHash = normalizeString(input.OwnershipDocumentHash)
	input.OwnershipDocumentCid = normalizeString(input.OwnershipDocumentCid)
	input.ContractHash = normalizeString(input.ContractHash)
	input.ContractCid = normalizeString(input.ContractCid)
	input.AuditPackageHash = normalizeString(input.AuditPackageHash)
	input.AuditPackageCid = normalizeString(input.AuditPackageCid)
	input.SignaturesHash = normalizeString(input.SignaturesHash)
	input.PlatformReference = normalizeString(input.PlatformReference)
	input.PlatformProofHash = normalizeString(input.PlatformProofHash)
	input.OccurredAt = normalizeString(input.OccurredAt)
	input.SellerUserId = normalizeString(input.SellerUserId)
	input.SellerFullName = normalizeString(input.SellerFullName)
	input.SellerNationalId = normalizeString(input.SellerNationalId)
	input.BuyerUserId = normalizeString(input.BuyerUserId)
	input.BuyerFullName = normalizeString(input.BuyerFullName)
	input.BuyerNationalId = normalizeString(input.BuyerNationalId)
	input.SellerSignedAt = normalizeString(input.SellerSignedAt)
	input.BuyerSignedAt = normalizeString(input.BuyerSignedAt)
	input.Price = normalizeString(input.Price)
	input.Currency = normalizeString(input.Currency)
	input.LandlordUserId = normalizeString(input.LandlordUserId)
	input.LandlordFullName = normalizeString(input.LandlordFullName)
	input.LandlordNationalId = normalizeString(input.LandlordNationalId)
	input.TenantUserId = normalizeString(input.TenantUserId)
	input.TenantFullName = normalizeString(input.TenantFullName)
	input.TenantNationalId = normalizeString(input.TenantNationalId)
	input.LandlordSignedAt = normalizeString(input.LandlordSignedAt)
	input.TenantSignedAt = normalizeString(input.TenantSignedAt)
	input.RentStartDate = normalizeString(input.RentStartDate)
	input.RentEndDate = normalizeString(input.RentEndDate)
	input.RentAmount = normalizeString(input.RentAmount)
}

func (input *RegistryDecisionInput) normalize() {
	input.TransactionId = normalizeString(input.TransactionId)
	input.RegistryReference = normalizeString(input.RegistryReference)
	input.EvidenceHash = normalizeString(input.EvidenceHash)
	input.EvidenceCid = normalizeString(input.EvidenceCid)
	input.ReasonCode = normalizeString(input.ReasonCode)
	input.ReasonSummary = normalizeString(input.ReasonSummary)
	input.DecisionNotesHash = normalizeString(input.DecisionNotesHash)
	input.DecidedAt = normalizeString(input.DecidedAt)
}

func (input *NotaryDecisionInput) normalize() {
	input.TransactionId = normalizeString(input.TransactionId)
	input.NotaryReference = normalizeString(input.NotaryReference)
	input.EvidenceHash = normalizeString(input.EvidenceHash)
	input.EvidenceCid = normalizeString(input.EvidenceCid)
	input.ReasonCode = normalizeString(input.ReasonCode)
	input.ReasonSummary = normalizeString(input.ReasonSummary)
	input.DecisionNotesHash = normalizeString(input.DecisionNotesHash)
	input.DecidedAt = normalizeString(input.DecidedAt)
}
