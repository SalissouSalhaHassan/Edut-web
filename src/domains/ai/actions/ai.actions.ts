"use server";

import { protectedDbAction } from "@/lib/protected-action";
import { AIAnalyticsService } from "../services/ai-analytics.service";

/**
 * Server action to get AI Dropout Risk Analysis for the current school
 */
export async function getDropoutRiskAnalysisAction() {
  return protectedDbAction("Pedagogie", "canView", async () => {
    const overview = await AIAnalyticsService.getSchoolDropoutRiskOverview();
    return { data: overview };
  });
}

/**
 * Server action for AI Teacher Assistant: Generate Homework Suggestions
 */
export async function generateAIHomeworkAction(payload: {
  subject: string;
  level: string;
  topic: string;
  difficulty: "facile" | "moyen" | "difficile";
}) {
  return protectedDbAction("Pedagogie", "canEdit", async () => {
    const result = AIAnalyticsService.generateAIHomework(payload);
    return { data: result.data };
  });
}
