
import { GoogleGenAI } from "@google/genai";

export const analyzeImage = async (
  base64Image: string,
  prompt: string,
  schemaJson: string,
  modelName: string,
  apiKeyOverride?: string 
): Promise<any> => {
  // Sử dụng window.process thay vì process trực tiếp để an toàn trên Vercel
  const activeKey = apiKeyOverride || (window as any).process?.env?.API_KEY;
  
  if (!activeKey) {
    throw new Error("Chưa cấu hình API Key hệ thống. Vui lòng thêm API Key cá nhân trong Cài đặt.");
  }

  const ai = new GoogleGenAI({ apiKey: activeKey });

  let schema;
  try {
    schema = typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson;
  } catch (e) {
    throw new Error("Dữ liệu Schema JSON không hợp lệ.");
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Extract parameters precisely. Follow the schema exactly.",
          },
        ],
      },
      config: {
        systemInstruction: prompt,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI không phản hồi dữ liệu.");

    return JSON.parse(text);
  } catch (error: any) {
    console.error(`Gemini Error:`, error);
    throw error;
  }
};
