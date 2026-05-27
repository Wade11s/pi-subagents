import { describe, expect, it } from "vitest";

// Simulate the responseText logic from agent-runner.ts
function getResponseText(
  collectorText: string,
  lastAssistantText: string,
): string {
  // Current behavior (buggy): prefer collector
  // return collectorText.trim() || lastAssistantText;

  // Fixed behavior: prefer lastAssistantText
  return lastAssistantText || collectorText.trim();
}

describe("responseText priority logic", () => {
  describe("fixed behavior (prefer lastAssistantText)", () => {
    it("returns lastAssistantText when both are available", () => {
      const result = getResponseText(
        "Summary: task completed",
        "Full content with all the details...",
      );
      expect(result).toBe("Full content with all the details...");
    });

    it("returns lastAssistantText when collector is empty", () => {
      const result = getResponseText(
        "",
        "Full content with all the details...",
      );
      expect(result).toBe("Full content with all the details...");
    });

    it("returns collectorText when lastAssistantText is empty", () => {
      const result = getResponseText(
        "Some partial output",
        "",
      );
      expect(result).toBe("Some partial output");
    });

    it("returns empty string when both are empty", () => {
      const result = getResponseText("", "");
      expect(result).toBe("");
    });

    it("handles steered scenario correctly", () => {
      // Simulate steered scenario:
      // - collector has summary from steered response
      // - lastAssistantText has complete content from session history
      const collectorText = "以上就是5个学科冷笑话，任务已完成。";
      const lastAssistantText = `【数学】sin 问 cos：我们什么时候结婚？cos 说：tan 你没戏。

【物理】一个光子走进酒吧，服务员问："需要点什么？" 光子说："不用了，我只是路过。"

【化学】两个原子走在路上，一个突然说："我好像丢了一个电子。" 另一个问："你确定吗？" 第一个回答："我正电着呢。"

【生物】一只草履虫对另一只说："别太自大，你也只不过是个单细胞生物。" 那只回答："至少我不会分裂人格。"

【历史】秦始皇焚书坑儒时，一个书生跑得特别快。旁人不解，书生说："我可是学体育史的。"`;

      const result = getResponseText(collectorText, lastAssistantText);
      expect(result).toBe(lastAssistantText);
      expect(result).toContain("【数学】");
      expect(result).toContain("【物理】");
      expect(result).toContain("【化学】");
      expect(result).toContain("【生物】");
      expect(result).toContain("【历史】");
    });
  });
});
