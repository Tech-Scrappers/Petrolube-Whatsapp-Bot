const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to extract number plate using OpenAI Vision
async function extractNumberPlate(imageBuffer) {
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
                            text: "Extract the car number plate from this image. Return only the number plate text in a clean format (e.g., ABC-1234 or ABC 1234). If no number plate is visible, return 'NOT_FOUND'."
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
            max_tokens: 50
        });
        const plateNumber = response.choices[0].message.content.trim();
        return plateNumber === 'NOT_FOUND' ? null : plateNumber;
    } catch (error) {
        console.error("Error extracting number plate:", error);
        return null;
    }
}

// Function to detect number of circular foils using OpenAI Vision
async function detectNumberOfFoils(imageBuffer) {
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
                            text: "How many circular foil seals (like the ones covering oil bottle openings) are visible in this image? Return only a single integer. If none are visible, return 0."
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
        const foilCount = parseInt(response.choices[0].message.content.trim(), 10);
        return isNaN(foilCount) ? 0 : foilCount;
    } catch (error) {
        console.error("Error detecting number of foils:", error);
        return 0;
    }
}

module.exports = {
    extractNumberPlate,
    detectNumberOfFoils
}; 