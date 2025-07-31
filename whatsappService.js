const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();
const templates = require('./whatsappTemplates');

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

/**
 * Send a WhatsApp template message by template name.
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Name of the template in whatsappTemplates.js
 * @param {Array<string>} parameters - Array of text parameters to fill in the template
 */
async function sendTemplateMessageByName(to, templateName, parameters = []) {
    try {
        const template = templates[templateName];
        if (!template) throw new Error(`Template '${templateName}' not found.`);

        // Build components array, replacing {{n}} with parameters[n-1]
        const components = [];
        for (const comp of template.components) {
            if (comp.type === 'body') {
                // WhatsApp expects parameters array for body
                components.push({
                    type: 'body',
                    parameters: parameters.map(text => ({ type: 'text', text }))
                });
            } else if (comp.type === 'header' && comp.text) {
                components.push({
                    type: 'header'
                    // No parameters for static text header
                });
            } else if (comp.type === 'footer' && comp.text) {
                components.push({
                    type: 'footer'
                    // No parameters for static text footer
                });
            } else if (comp.type === 'buttons' && Array.isArray(comp.buttons)) {
                // For each button, add a separate component with correct index and NO parameters for quick_reply
                comp.buttons.forEach((btn, idx) => {
                    components.push({
                        type: 'button',
                        sub_type: 'quick_reply',
                        index: idx.toString()
                        // Absolutely NO parameters field here
                    });
                });
            }
        }

        await axios.post(
            `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: template.name,
                    language: template.language,
                    components
                }
            },
            {
                headers: { Authorization: `Bearer ${API_TOKEN}` }
            }
        );
        console.log(`Template message '${templateName}' sent successfully`);
    } catch (error) {
        console.error(`Error sending template message '${templateName}':`, error?.response?.data || error.message);
        throw error;
    }
}

/**
 * Send a typing indicator to WhatsApp user.
 * @param {string} to - Recipient phone number
 * @param {string} messageId - The ID of the received message
 */
async function sendTypingIndicator(to, messageId) {
    try {
        await axios.post(
            `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                status: "read",
                message_id: messageId,
                typing_indicator: { type: "text" }
            },
            {
                headers: { Authorization: `Bearer ${API_TOKEN}` },
            }
        );
        console.log("Typing indicator sent successfully");
    } catch (error) {
        console.error("Error sending typing indicator:", error?.response?.data || error.message);
    }
}

module.exports = {
    sendMessage,
    downloadImage,
    sendTemplateMessageByName,
    sendTypingIndicator
}; 