# Oil Change Logging Implementation

## Overview

This implementation adds comprehensive logging functionality to track the entire oil change conversation flow between mechanics and the WhatsApp bot. The logging system creates a conversation thread that maintains the relationship between all messages in a single oil change session.

## API Endpoint

The logging system uses the following API endpoint:
- **URL**: `${EXTERNAL_API_BASE_URL}/bot/oil-change-logs`
- **Method**: POST
- **Headers**: 
  - `X-Petrolube-Secret-Key`: Authentication key
  - `Content-Type`: application/json

## Request Structure

```json
{
  "parent_id": null,  // null for initial log, log ID for subsequent logs
  "step": 1,          // Sequential step number in the conversation
  "status": "passed", // "passed" or "failed"
  "details": "Full message content",
  "message": "Single line summary"
}
```

## Response Structure

```json
{
  "log_name": "default",
  "properties": {
    "parent_id": null,
    "step": 1,
    "status": "passed",
    "details": null
  },
  "batch_uuid": null,
  "causer_id": 123,
  "causer_type": "App\\Models\\Mechanic",
  "event": "oil_change_submission",
  "description": "Please upload car number plate",
  "updated_at": "2025-09-01T11:01:11.000000Z",
  "created_at": "2025-09-01T11:01:11.000000Z",
  "id": 4,
  "causer": {
    "id": 123,
    "shop_id": "7266a41c-5cac-4466-9bfc-2605bf3168d1",
    "full_name": "محمد ياسين",
    "mobile_number": "966566431431",
    "email": null,
    "number_of_oil_changes": 0,
    "status": "approved"
  },
  "subject": null
}
```

## Logging Flow

### 1. Initial Log Creation (Step 1)
- **Trigger**: When mechanic starts oil change flow (sends "1", "start", or "oil change")
- **parent_id**: `null`
- **step**: `1`
- **details**: Mechanic's initial message
- **message**: "Started oil change flow"

### 2. Bot Response - QR Codes Request (Step 2)
- **Trigger**: After mechanic verification
- **parent_id**: ID from Step 1
- **step**: `2`
- **details**: Full bot message requesting QR codes
- **message**: "Bot requested QR codes photo"

### 3. Mechanic Sends QR Codes Image (Step 3)
- **Trigger**: When mechanic sends image in "qr_codes" state
- **parent_id**: ID from Step 2
- **step**: `3`
- **details**: "Image sent by mechanic for QR codes"
- **message**: "Mechanic sent QR codes photo"

### 4. QR Codes Processing Results (Step 4)
- **Success**: QR codes processed successfully
- **Failure**: Insufficient foils, validation failed, or no QR codes detected
- **parent_id**: ID from Step 3
- **step**: `4`
- **details**: Bot response message
- **message**: Success or error summary

### 5. Bot Response - Number Plate Request (Step 5)
- **Trigger**: After successful QR processing
- **parent_id**: ID from Step 4
- **step**: `5`
- **details**: Full bot message requesting number plate
- **message**: "Bot processed QR codes successfully and requested number plate"

### 6. Mechanic Sends Number Plate Image (Step 6)
- **Trigger**: When mechanic sends image in "number_plate" state
- **parent_id**: ID from Step 5
- **step**: `6`
- **details**: "Image sent by mechanic for number plate"
- **message**: "Mechanic sent number plate photo"

### 7. Number Plate Processing Results (Step 7)
- **Success**: Number plate processed successfully
- **Failure**: Detection failed, duplicate, or invalid plate
- **parent_id**: ID from Step 6
- **step**: `7`
- **details**: Bot response message
- **message**: Success or error summary

### 8. Bot Response - Customer Mobile Request (Step 8)
- **Trigger**: After successful number plate processing
- **parent_id**: ID from Step 7
- **step**: `8`
- **details**: Full bot message requesting customer mobile
- **message**: "Bot processed number plate successfully and requested customer mobile"

### 9. Mechanic Enters Customer Mobile (Step 9)
- **Trigger**: When mechanic sends text in "customer_mobile" state
- **parent_id**: ID from Step 8
- **step**: `9`
- **details**: Mechanic's mobile number input
- **message**: "Mechanic entered customer mobile number"

### 10-12. Customer Mobile Validation (Steps 10-12)
- **Step 10**: Format validation error
- **Step 11**: Duplication validation error
- **Step 12**: Success - requests customer name
- **parent_id**: ID from Step 9
- **details**: Bot response message
- **message**: Error or success summary

### 13. Mechanic Enters Customer Name (Step 13)
- **Trigger**: When mechanic sends text in "customer_name" state
- **parent_id**: ID from Step 12
- **step**: `13`
- **details**: Mechanic's customer name input
- **message**: "Mechanic entered customer name"

### 14. Final Submission (Step 14)
- **Success**: Oil change submission completed
- **Failure**: API error or validation failure
- **parent_id**: ID from Step 13
- **step**: `14`
- **details**: Submission result details
- **message**: Success or error summary

### 15. Bot Final Response (Step 15)
- **Trigger**: After successful submission
- **parent_id**: ID from Step 14
- **step**: `15`
- **details**: Final bot confirmation message
- **message**: "Bot confirmed successful submission"

## Implementation Details

### Files Modified

1. **apiService.js**
   - Added `createOilChangeLog()` function
   - Exported the function in module.exports

2. **routes/webhook.js**
   - Imported `createOilChangeLog` function
   - Added logging calls at each step of the oil change flow
   - Integrated logging with existing error handling

### Session Management

The logging system uses the session data to maintain the `logParentId`:
```javascript
session.data.logParentId = logResponse.id;
```

This ID is used for all subsequent logs in the same oil change session.

### Error Handling

- All logging calls are wrapped in try-catch blocks
- Logging failures don't interrupt the main flow
- Error logs are created with `status: "failed"`
- Success logs are created with `status: "passed"`

### Testing

A test file `test-logging.js` is provided to verify the logging functionality:
```bash
node test-logging.js
```

## Benefits

1. **Complete Audit Trail**: Every message in the oil change flow is logged
2. **Conversation Threading**: All messages are linked via parent_id
3. **Error Tracking**: Failed steps are clearly marked
4. **Analytics**: Step-by-step analysis of user behavior
5. **Debugging**: Easy to trace issues in the conversation flow
6. **Compliance**: Full record of all interactions

## Usage Example

```javascript
// Create initial log
const initialLog = await createOilChangeLog(
    mechanicId,
    null, // parent_id = null for initial log
    1, // step
    "passed", // status
    "1", // details
    "Started oil change flow" // message
);

// Create subsequent log
const subsequentLog = await createOilChangeLog(
    mechanicId,
    initialLog.id, // parent_id = previous log ID
    2, // step
    "passed", // status
    "Bot message content", // details
    "Bot requested QR codes" // message
);
```

## Environment Variables

Ensure these environment variables are set:
- `EXTERNAL_API_BASE_URL`: Base URL for the logging API
- `PETROLUBE_SECRET_KEY`: Authentication key for API calls
