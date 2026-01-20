import { describe, test, expect } from "bun:test";
import {
  selectTechniques,
  TechniqueSet,
  TaskContext,
} from "../lib/decision-graph";

describe("selectTechniques", () => {
  describe("code tasks", () => {
    test("selects base techniques for code tasks", () => {
      const result = selectTechniques("fix the bug", {
        taskType: "code",
        complexity: 0.5,
      });

      expect(result.base).toContain("structured_output");
      expect(result.base).toContain("verification_step");
    });

    test("adds plan_and_solve for complex code tasks", () => {
      const result = selectTechniques("complex refactoring across multiple files", {
        taskType: "code",
        complexity: 0.8,
      });

      expect(result.base).toContain("plan_and_solve");
    });

    test("includes test_first as optional for code tasks", () => {
      const result = selectTechniques("implement new feature", {
        taskType: "code",
        complexity: 0.5,
      });

      expect(result.optional).toContain("test_first");
    });
  });

  describe("reasoning tasks", () => {
    test("selects chain_of_thought for reasoning tasks", () => {
      const result = selectTechniques("why does this timeout?", {
        taskType: "reasoning",
        complexity: 0.5,
      });

      expect(result.base).toContain("chain_of_thought");
    });

    test("adds decomposition for complex reasoning", () => {
      const result = selectTechniques("explain this complex algorithm", {
        taskType: "reasoning",
        complexity: 0.8,
      });

      expect(result.base).toContain("chain_of_thought");
      // Decomposition added for high complexity
      expect(result.base.concat(result.optional)).toContain("least_to_most");
    });
  });

  describe("classification tasks", () => {
    test("avoids CoT for classification (antipattern)", () => {
      const result = selectTechniques("is this code secure?", {
        taskType: "classification",
        complexity: 0.5,
      });

      expect(result.base).toContain("zero_shot_direct");
      expect(result.antipatterns).toContain("chain_of_thought");
    });
  });

  describe("synthesis tasks", () => {
    test("selects role_prompting for synthesis", () => {
      const result = selectTechniques("write a function to parse CSV", {
        taskType: "synthesis",
        complexity: 0.5,
      });

      expect(result.base).toContain("role_prompting");
      expect(result.base).toContain("structured_output");
    });
  });

  describe("research tasks", () => {
    test("selects context_injection for research", () => {
      const result = selectTechniques("find all API endpoints", {
        taskType: "research",
        complexity: 0.5,
      });

      expect(result.base).toContain("context_injection");
    });
  });

  describe("evaluation tasks", () => {
    test("selects structured_output and verification for evaluation", () => {
      const result = selectTechniques("review this PR", {
        taskType: "evaluation",
        complexity: 0.5,
      });

      expect(result.base).toContain("structured_output");
      expect(result.base).toContain("verification");
    });
  });

  describe("agentic tasks", () => {
    test("selects plan_and_solve for agentic tasks", () => {
      const result = selectTechniques("set up CI/CD pipeline", {
        taskType: "agentic",
        complexity: 0.5,
      });

      expect(result.base).toContain("plan_and_solve");
      expect(result.base).toContain("verification_step");
    });
  });

  describe("cross-cutting concerns", () => {
    test("adds self_critique for correctness-critical tasks", () => {
      const result = selectTechniques("fix the security vulnerability", {
        taskType: "code",
        complexity: 0.5,
        correctnessCritical: true,
      });

      expect(result.base).toContain("self_critique");
      expect(result.base).toContain("verification");
    });

    test("adds structured_output_enforcement for JSON output", () => {
      const result = selectTechniques("return the result as JSON", {
        taskType: "code",
        complexity: 0.5,
        jsonOutput: true,
      });

      expect(result.base).toContain("structured_output_enforcement");
    });

    test("adds clarification_request for underspecified input", () => {
      const result = selectTechniques("fix it", {
        taskType: "code",
        complexity: 0.5,
        underspecified: true,
      });

      expect(result.base).toContain("clarification_request");
    });
  });

  describe("TechniqueSet structure", () => {
    test("returns base, optional, and antipatterns arrays", () => {
      const result = selectTechniques("test input", {
        taskType: "code",
        complexity: 0.5,
      });

      expect(Array.isArray(result.base)).toBe(true);
      expect(Array.isArray(result.optional)).toBe(true);
      expect(Array.isArray(result.antipatterns)).toBe(true);
    });

    test("no duplicate techniques in base", () => {
      const result = selectTechniques("complex security fix in production", {
        taskType: "code",
        complexity: 0.9,
        correctnessCritical: true,
      });

      const uniqueBase = [...new Set(result.base)];
      expect(result.base.length).toBe(uniqueBase.length);
    });
  });
});
