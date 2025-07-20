const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const API_TOKEN = process.env.API_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Helper function to send WhatsApp message
async function sendMessage(to, text, buttons = null) {
    try {
        let messageData = {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text }
        };

        if (buttons) {
            messageData = {
                messaging_product: "whatsapp",
                to,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: text },
                    action: {
                        buttons: buttons
                    }
                }
            };
        }

        await axios.post(
            `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
            messageData,
            {
                headers: { Authorization: `Bearer ${API_TOKEN}` },
            }
        );
        console.log("Message sent successfully");
    } catch (error) {
        console.error("Error sending message:", error?.response?.data || error.message);
        throw error;
    }
}

// Helper function to download image from WhatsApp
async function downloadImage(imageId) {
    try {
        const metadataUrl = `${WHATSAPP_API_URL}/${imageId}`;
        const metadataResponse = await axios.get(metadataUrl, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
        });

        if (!metadataResponse.data.url) {
            throw new Error("Invalid image metadata received.");
        }

        const imageUrl = metadataResponse.data.url;
        const imageResponse = await axios.get(imageUrl, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
            responseType: 'arraybuffer',
        });

        return Buffer.from(imageResponse.data);
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

// Function to send a WhatsApp template message for customer confirmation
async function sendTemplateMessage(to, customerName, plateNumber) {
    try {
        console.log("Customer Name:", customerName, "Plate Number:", plateNumber);
        await axios.post(
            `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: "car_oil_change_reward",
                    language: { code: "en" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: customerName },
                                { type: "text", text: plateNumber }
                            ]
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                { type: "text", text: "spin-a-wheel" }
                            ]
                        }
                    ]
                }
            },
            {
                headers: { Authorization: `Bearer ${API_TOKEN}` }
            }
        );
        console.log("Template message sent successfully");
    } catch (error) {
        console.error("Error sending template message:", error?.response?.data || error.message);
    }
}

module.exports = {
    sendMessage,
    downloadImage,
    sendTemplateMessage
}; 