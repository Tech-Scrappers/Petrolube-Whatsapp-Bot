# Image Detection API Documentation

## Endpoint: `/detect-foils`

This endpoint detects empty foils (foils with no QR codes) in an uploaded image using the same detection logic as the WhatsApp bot.

### Method: POST

### Request Format:

#### Option 1: Form-Data (Recommended for file uploads)
```
Content-Type: multipart/form-data
Body: image file with key "image"
```

#### Option 2: JSON with Base64
```json
{
  "image": "base64_encoded_image_data"
}
```

### Image Requirements:
- Supported formats: JPEG, PNG, etc.
- Maximum file size: 10MB
- For base64: You can include the data URL prefix (e.g., `data:image/jpeg;base64,`) or just the base64 data

### Response Format:

#### Success Response (200):
```json
{
  "success": true,
  "emptyFoils": 2,
  "message": "Detected 2 empty foil(s) in the image"
}
```

#### Error Responses:

**400 Bad Request** - Missing or invalid image:
```json
{
  "success": false,
  "error": "Image data is required. Please provide image in base64 format."
}
```

**400 Bad Request** - Invalid image format:
```json
{
  "success": false,
  "error": "Invalid image format. Please provide a valid base64 encoded image."
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Internal server error during image processing"
}
```

### Example Usage:

#### Using cURL (Form-Data):
```bash
curl -X POST http://localhost:3000/detect-foils \
  -F "image=@/path/to/your/image.jpg"
```

#### Using cURL (Base64):
```bash
curl -X POST http://localhost:3000/detect-foils \
  -H "Content-Type: application/json" \
  -d '{
    "image": "base64_encoded_image_data_here"
  }'
```

#### Using JavaScript/Fetch (Form-Data):
```javascript
const formData = new FormData();
formData.append('image', imageFile); // imageFile is a File object

const response = await fetch('http://localhost:3000/detect-foils', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`Detected ${result.emptyFoils} empty foils`);
```

#### Using JavaScript/Fetch (Base64):
```javascript
const response = await fetch('http://localhost:3000/detect-foils', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image: base64ImageData
  })
});

const result = await response.json();
console.log(`Detected ${result.emptyFoils} empty foils`);
```

### Notes:
- The endpoint uses OpenAI Vision to directly detect empty foils (no QR codes, text, or markings)
- Returns the count of completely blank/empty foil seals
- If no empty foils are detected, `emptyFoils` will be 0
- The detection is designed to identify foil seals that cover oil bottle openings
- Perfect for validating that users upload legitimate images with the expected empty foil seals

## Environment Variables

The application uses several environment variables for configuration. Create a `.env` file in the root directory with the following variables:

### Required Variables:
- `WHATSAPP_API_URL`: WhatsApp Business API URL
- `API_TOKEN`: WhatsApp Business API token
- `PHONE_NUMBER_ID`: WhatsApp phone number ID
- `OPENAI_API_KEY`: OpenAI API key for image processing
- `PYTHON_QR_API_URL`: URL for QR code scanning service
- `EXTERNAL_API_BASE_URL`: Base URL for external API calls
- `PETROLUBE_SECRET_KEY`: Secret key for Petrolube API authentication
- `WEBHOOK_VERIFY_TOKEN`: Token for webhook verification

### Campaign Configuration:
- `CAMPAIGN_ACTIVE`: Set to `'true'` to enable the campaign, `'false'` or leave unset to disable
  - When `CAMPAIGN_ACTIVE=false`: All user messages will receive a "campaign not started" response
  - Onboarding endpoints (`/send-shop-registration-message`, `/send-mechanic-registration-message`) remain functional regardless of campaign status

### Optional Variables:
- `PETROLUBE_TERMS_URL_OWNER`: URL for owner terms and conditions (defaults to local PDF)
- `PETROLUBE_TERMS_URL_LABOUR`: URL for labour terms and conditions (defaults to local PDF) 