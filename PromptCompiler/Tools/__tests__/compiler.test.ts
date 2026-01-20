import { describe, test, expect } from "bun:test";
import {
  compilePrompt,
  compileResearchPrompt,
  assessClarity,
  CompiledPrompt,
} from "../lib/compiler";
import { TechniqueSet } from "../lib/decision-graph";

describe("compilePrompt", () => {
  describe("basic compilation", () => {
    test("includes task description section", () => {
      const techniques: TechniqueSet = {
        base: ["structured_output"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("fix the auth bug", "code", techniques);

      expect(result.prompt).toContain("## Task");
      expect(result.prompt).toContain("fix the auth bug");
    });

    test("returns compiled prompt structure", () => {
      const techniques: TechniqueSet = {
        base: ["structured_output"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("test input", "code", techniques);

      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("techniques");
      expect(result).toHaveProperty("changes");
      expect(typeof result.prompt).toBe("string");
    });
  });

  describe("technique sections", () => {
    test("includes chain_of_thought section when selected", () => {
      const techniques: TechniqueSet = {
        base: ["chain_of_thought"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("why does this fail?", "reasoning", techniques);

      expect(result.prompt).toContain("## Approach");
      expect(result.prompt).toContain("step by step");
    });

    test("includes verification section when selected", () => {
      const techniques: TechniqueSet = {
        base: ["verification"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("fix security issue", "code", techniques);

      expect(result.prompt).toContain("## Verification");
      expect(result.prompt).toContain("Solution addresses the core problem");
    });

    test("includes plan_and_solve section when selected", () => {
      const techniques: TechniqueSet = {
        base: ["plan_and_solve"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("set up CI/CD", "agentic", techniques);

      expect(result.prompt).toContain("## Plan");
      expect(result.prompt).toContain("Before implementing");
    });

    test("includes role section when role_prompting selected", () => {
      const techniques: TechniqueSet = {
        base: ["role_prompting"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("write documentation", "synthesis", techniques);

      expect(result.prompt).toContain("## Role");
    });

    test("includes self_critique section when selected", () => {
      const techniques: TechniqueSet = {
        base: ["self_critique"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("fix production bug", "code", techniques);

      expect(result.prompt).toContain("## Self-Review");
      expect(result.prompt).toContain("What could go wrong");
    });

    test("includes clarification section when selected", () => {
      const techniques: TechniqueSet = {
        base: ["clarification_request"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("fix it", "code", techniques);

      expect(result.prompt).toContain("## Clarification Needed");
    });
  });

  describe("multiple techniques composition", () => {
    test("composes multiple techniques into single prompt", () => {
      const techniques: TechniqueSet = {
        base: ["structured_output", "verification_step", "plan_and_solve"],
        optional: ["test_first"],
        antipatterns: [],
      };

      const result = compilePrompt("refactor the auth module", "code", techniques);

      expect(result.prompt).toContain("## Task");
      expect(result.prompt).toContain("## Plan");
      expect(result.prompt).toContain("## Verification");
    });

    test("tracks applied techniques in changes", () => {
      const techniques: TechniqueSet = {
        base: ["chain_of_thought", "verification"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt("explain the algorithm", "reasoning", techniques);

      expect(result.techniques).toContain("chain_of_thought");
      expect(result.techniques).toContain("verification");
    });
  });

  describe("context handling", () => {
    test("includes context section when provided", () => {
      const techniques: TechniqueSet = {
        base: ["context_injection"],
        optional: [],
        antipatterns: [],
      };

      const result = compilePrompt(
        "find the bug",
        "code",
        techniques,
        "src/auth.ts contains the login logic"
      );

      expect(result.prompt).toContain("## Context");
      expect(result.prompt).toContain("src/auth.ts");
    });
  });
});

describe("assessClarity", () => {
  test("returns low score for vague input", () => {
    expect(assessClarity("do it")).toBeLessThan(50);
    expect(assessClarity("fix")).toBeLessThan(50);
    expect(assessClarity("help")).toBeLessThan(50);
  });

  test("returns higher score for specific input", () => {
    expect(assessClarity("fix the authentication bug in src/login.ts")).toBeGreaterThan(60);
    expect(assessClarity("refactor the user service to use dependency injection")).toBeGreaterThan(60);
  });

  test("returns score between 0 and 100", () => {
    const score1 = assessClarity("x");
    const score2 = assessClarity("a very detailed and specific request about fixing bugs");

    expect(score1).toBeGreaterThanOrEqual(0);
    expect(score1).toBeLessThanOrEqual(100);
    expect(score2).toBeGreaterThanOrEqual(0);
    expect(score2).toBeLessThanOrEqual(100);
  });

  test("longer inputs generally score higher", () => {
    const short = assessClarity("fix bug");
    const long = assessClarity("fix the authentication bug in the login module that causes session timeout");

    expect(long).toBeGreaterThan(short);
  });
});

// ============================================================================
// RESEARCH CONTRACT TESTS
// ============================================================================

describe("compileResearchPrompt", () => {
  describe("structure", () => {
    test("includes all 5 required sections", () => {
      const result = compileResearchPrompt("Search for Claude Code hooks best practices");

      expect(result.prompt).toContain("## Task");
      expect(result.prompt).toContain("## Focus Areas");
      expect(result.prompt).toContain("## Search Plan");
      expect(result.prompt).toContain("## Source Policy");
      expect(result.prompt).toContain("## Return Contract");
    });

    test("sections appear in correct order", () => {
      const result = compileResearchPrompt("Search for API documentation");

      const taskIndex = result.prompt.indexOf("## Task");
      const focusIndex = result.prompt.indexOf("## Focus Areas");
      const searchIndex = result.prompt.indexOf("## Search Plan");
      const sourceIndex = result.prompt.indexOf("## Source Policy");
      const contractIndex = result.prompt.indexOf("## Return Contract");

      expect(taskIndex).toBeLessThan(focusIndex);
      expect(focusIndex).toBeLessThan(searchIndex);
      expect(searchIndex).toBeLessThan(sourceIndex);
      expect(sourceIndex).toBeLessThan(contractIndex);
    });

    test("tracks research-specific techniques", () => {
      const result = compileResearchPrompt("Find best practices");

      expect(result.techniques).toContain("research_decomposition");
      expect(result.techniques).toContain("source_policy");
      expect(result.techniques).toContain("citation_contract");
    });
  });

  describe("focus area mapping", () => {
    test("selects hooks focus areas for hooks query", () => {
      const result = compileResearchPrompt("Search for Claude Code hooks best practices");

      expect(result.prompt).toContain("Hook lifecycle");
      expect(result.prompt).toContain("Deterministic enforcement");
      expect(result.prompt).toContain("Anti-patterns");
    });

    test("selects security focus areas for security query", () => {
      const result = compileResearchPrompt("Find authentication security best practices");

      expect(result.prompt).toContain("Injection vectors");
      expect(result.prompt).toContain("Permission models");
      expect(result.prompt).toContain("Secret management");
    });

    test("selects API focus areas for api query", () => {
      const result = compileResearchPrompt("Research REST API design patterns");

      expect(result.prompt).toContain("Schema design");
      expect(result.prompt).toContain("Error handling conventions");
    });

    test("combines focus areas for multi-domain query", () => {
      const result = compileResearchPrompt("Find API security best practices");

      // Should have both security and API focus areas
      expect(result.prompt).toContain("Injection vectors"); // security
      expect(result.prompt).toContain("Schema design"); // api
    });

    test("uses default focus areas when no domain matches", () => {
      const result = compileResearchPrompt("Research quantum computing");

      expect(result.prompt).toContain("Key concepts and terminology");
      expect(result.prompt).toContain("Core implementation patterns");
    });

    test("limits focus areas to 7 max", () => {
      const result = compileResearchPrompt("Find API security testing performance architecture patterns");

      // Count bullet points in Focus Areas section
      const focusSection = result.prompt.split("## Focus Areas")[1].split("## Search Plan")[0];
      const bulletCount = (focusSection.match(/^- /gm) || []).length;

      expect(bulletCount).toBeLessThanOrEqual(7);
    });
  });

  describe("recency sensitivity", () => {
    test("uses 30 days for 'latest' queries", () => {
      const result = compileResearchPrompt("What are the latest Claude API changes");

      expect(result.prompt).toContain("last 30 days");
    });

    test("uses 90 days for version/changelog queries", () => {
      const result = compileResearchPrompt("Find version update notes for React");

      expect(result.prompt).toContain("last 90 days");
    });

    test("uses 90 days as default for software research", () => {
      const result = compileResearchPrompt("Search for Claude Code hooks best practices");

      expect(result.prompt).toContain("last 90 days");
    });
  });

  describe("source policy", () => {
    test("includes priority ranking", () => {
      const result = compileResearchPrompt("Find documentation");

      expect(result.prompt).toContain("Priority 1: Official documentation");
      expect(result.prompt).toContain("Priority 2: Official GitHub");
      expect(result.prompt).toContain("Priority 3: Release notes");
      expect(result.prompt).toContain("Priority 4: Blogs");
    });

    test("requires citations for primary sources", () => {
      const result = compileResearchPrompt("Research API patterns");

      expect(result.prompt).toContain("(must cite)");
    });
  });

  describe("return contract", () => {
    test("requires summary table format", () => {
      const result = compileResearchPrompt("Find best practices");

      expect(result.prompt).toContain("Summary table: Topic | Recommendation | Evidence URL");
    });

    test("requires citations for claims", () => {
      const result = compileResearchPrompt("Research patterns");

      expect(result.prompt).toContain("Every non-trivial claim must include a source URL");
    });

    test("requires uncertainty disclosure", () => {
      const result = compileResearchPrompt("Find approaches");

      expect(result.prompt).toContain("If sources disagree, list both and state uncertainty");
    });
  });

  describe("determinism", () => {
    test("produces identical output for identical input", () => {
      const input = "Search for Claude Code hooks best practices";

      const result1 = compileResearchPrompt(input);
      const result2 = compileResearchPrompt(input);

      expect(result1.prompt).toBe(result2.prompt);
      expect(result1.techniques).toEqual(result2.techniques);
      expect(result1.changes).toEqual(result2.changes);
    });
  });
});
