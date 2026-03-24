/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeProfile(bio: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy phân tích đoạn giới thiệu bản thân sau đây và đưa ra 3 lời khuyên để làm cho nó hấp dẫn hơn đối với cộng đồng hẹn hò nghiêm túc tại Hàn Quốc: "${bio}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing profile:", error);
    return null;
  }
}

export async function getKoreanLifestyleTips() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hãy đưa ra 5 lời khuyên hữu ích cho người Việt mới sang Hàn Quốc để hòa nhập cộng đồng và tìm kiếm các mối quan hệ văn minh.",
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error getting lifestyle tips:", error);
    return null;
  }
}
