const express = require('express');
const router = express.Router();
const { detectNumberOfFoils } = require('../openaiService');
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to detect empty foils using OpenAI Vision
async function detectEmptyFoils(imageBuffer) {
    try {
        const base64Image = imageBuffer.toString('base64');
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "How many circular foil seals (like the ones covering oil bottle openings) are completely blank/empty (no QR codes, no text, no markings) in this image? Return only a single integer. If none are visible, return 0."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 10
        });
        const emptyFoilCount = parseInt(response.choices[0].message.content.trim(), 10);
        return isNaN(emptyFoilCount) ? 0 : emptyFoilCount;
    } catch (error) {
        console.error("Error detecting empty foils:", error);
        return 0;
    }
}

// Image detection endpoint for empty foils
router.post('/detect-foils', async (req, res) => {
    try {
        let imageBuffer;

        // Check if image is provided as form-data (file upload)
        if (req.files && req.files.image) {
            imageBuffer = req.files.image.data;
        }
        // Check if image is provided as base64 in JSON
        else if (req.body.image) {
            try {
                // Remove data URL prefix if present
                let base64Data = req.body.image;
                if (base64Data.startsWith('data:image/')) {
                    base64Data = base64Data.split(',')[1];
                }
                imageBuffer = Buffer.from(base64Data, 'base64');
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid image format. Please provide a valid base64 encoded image.'
                });
            }
        }
        // No image provided
        else {
            return res.status(400).json({
                success: false,
                error: 'Image is required. Please provide image as form-data file or base64 in JSON body.'
            });
        }

        // Detect empty foils directly using OpenAI
        const emptyFoilsCount = await detectEmptyFoils(imageBuffer);

        // Return the result
        res.json({
            success: true,
            emptyFoils: emptyFoilsCount,
            message: `Detected ${emptyFoilsCount} empty foil(s) in the image`
        });

    } catch (error) {
        console.error('Error in foil detection endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during image processing'
        });
    }
});

module.exports = router; 