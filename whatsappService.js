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

        // Build components array
        const components = [];
        let bodyParameterIndex = 0;
        let buttonParameterIndex = 0;

        for (const comp of template.components) {
            if (comp.type === 'body') {
                // Extract body parameters from the template text
                const bodyParams = [];
                const bodyText = comp.text;
                const bodyParamMatches = bodyText.match(/\{\{(\d+)\}\}/g);
                
                if (bodyParamMatches) {
                    bodyParamMatches.forEach(match => {
                        const paramIndex = parseInt(match.replace(/\{\{|\}\}/g, '')) - 1;
                        if (parameters[paramIndex]) {
                            bodyParams.push({ type: 'text', text: parameters[paramIndex] });
                        }
                    });
                }

                components.push({
                    type: 'body',
                    parameters: bodyParams
                });
            } else if (comp.type === 'header') {
                if (comp.format === 'VIDEO') {
                    // Handle video header
                    components.push({
                        type: 'header',
                        parameters: [{
                            type: 'video',
                            video: {
                                link: comp.text
                            }
                        }]
                    });
                } else if (comp.format === 'IMAGE') {
                    // Handle image header
                    components.push({
                        type: 'header',
                        parameters: [{
                            type: 'image',
                            image: {
                                link: comp.text
                            }
                        }]
                    });
                } else if (comp.text) {
                    // Handle text header
                    components.push({
                        type: 'header'
                        // No parameters for static text header
                    });
                }
            } else if (comp.type === 'footer' && comp.text) {
                components.push({
                    type: 'footer'
                    // No parameters for static text footer
                });
            } else if (comp.type === 'buttons' && Array.isArray(comp.buttons)) {
                // Handle buttons with parameters
                comp.buttons.forEach((btn, idx) => {
                    const buttonComponent = {
                        type: 'button',
                        sub_type: btn.type === 'URL' ? 'url' : 'quick_reply',
                        index: idx.toString()
                    };

                    // Add parameters for URL buttons if they have dynamic URLs
                    if (btn.type === 'URL' && btn.url && btn.url.includes('{{')) {
                        const urlParamMatches = btn.url.match(/\{\{(\d+)\}\}/g);
                        if (urlParamMatches) {
                            const urlParams = [];
                            urlParamMatches.forEach(match => {
                                const paramIndex = parseInt(match.replace(/\{\{|\}\}/g, '')) - 1;
                                if (parameters[paramIndex]) {
                                    urlParams.push({ type: 'text', text: parameters[paramIndex] });
                                }
                            });
                            if (urlParams.length > 0) {
                                buttonComponent.parameters = urlParams;
                            }
                        }
                    }

                    components.push(buttonComponent);
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

/**
 * Send a video message via WhatsApp Cloud API.
 * @param {string} to - Recipient phone number
 * @param {string} videoUrl - URL of the video to send
 * @param {string} caption - Optional caption for the video
 */
async function sendVideoMessage(to, videoUrl, caption = "شاهد الفيديو لمزيد من التفاصيل") {
    try {
        await axios.post(
            `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "video",
                video: { 
                    link: videoUrl, 
                    caption: caption 
                }
            },
            {
                headers: { 
                    Authorization: `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("Video message sent successfully");
    } catch (error) {
        console.error("Error sending video message:", error?.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    sendMessage,
    downloadImage,
    sendTemplateMessageByName,
    sendTypingIndicator,
    sendVideoMessage
}; 