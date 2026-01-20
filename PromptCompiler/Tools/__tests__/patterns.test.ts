import { describe, test, expect } from "bun:test";
import {
  classifyTask,
  assessComplexity,
  extractConstraints,
  TaskType,
} from "../lib/patterns";

describe("classifyTask", () => {
  describe("code tasks", () => {
    test("detects file extensions as code", () => {
      expect(classifyTask("fix the bug in src/auth.ts")).toBe("code");
      expect(classifyTask("refactor user.py")).toBe("code");
      expect(classifyTask("update main.go")).toBe("code");
    });

    test("detects code keywords", () => {
      expect(classifyTask("fix the auth bug")).toBe("code");
      expect(classifyTask("refactor the user service")).toBe("code");
      expect(classifyTask("implement OAuth flow")).toBe("code");
      expect(classifyTask("debug the login issue")).toBe("code");
    });

    test("detects path patterns", () => {
      expect(classifyTask("update src/components/Button")).toBe("code");
      expect(classifyTask("fix the lib/utils issue")).toBe("code");
    });
  });

  describe("reasoning tasks", () => {
    test("detects 'why' questions", () => {
      expect(classifyTask("why does this timeout?")).toBe("reasoning");
      expect(classifyTask("why is the test failing?")).toBe("reasoning");
    });

    test("detects 'explain' requests", () => {
      expect(classifyTask("explain the memory leak")).toBe("reasoning");
      expect(classifyTask("explain how this works")).toBe("reasoning");
    });

    test("detects calculation requests", () => {
      expect(classifyTask("calculate the time complexity")).toBe("reasoning");
      expect(classifyTask("solve this equation")).toBe("reasoning");
    });
  });

  describe("synthesis tasks", () => {
    test("detects creation requests", () => {
      expect(classifyTask("write a function to parse CSV")).toBe("synthesis");
      expect(classifyTask("create a new component")).toBe("synthesis");
      expect(classifyTask("generate a report")).toBe("synthesis");
    });

    test("distinguishes from code fixes", () => {
      // "write" + "bug" should lean toward code
      expect(classifyTask("write a fix for the bug")).toBe("code");
    });
  });

  describe("classification tasks", () => {
    test("detects binary questions", () => {
      expect(classifyTask("is this code secure?")).toBe("classification");
      expect(classifyTask("yes or no, is this valid?")).toBe("classification");
    });

    test("detects categorization requests", () => {
      expect(classifyTask("categorize these files")).toBe("classification");
      expect(classifyTask("which type of error is this?")).toBe("classification");
    });
  });

  describe("research tasks", () => {
    test("detects search requests", () => {
      expect(classifyTask("find all usages of this function")).toBe("research");
      expect(classifyTask("search for similar patterns")).toBe("research");
      expect(classifyTask("list all API endpoints")).toBe("research");
    });

    test("detects information gathering", () => {
      expect(classifyTask("what are the dependencies?")).toBe("research");
      expect(classifyTask("show me examples of this pattern")).toBe("research");
    });
  });

  describe("evaluation tasks", () => {
    test("detects review requests", () => {
      expect(classifyTask("review this PR")).toBe("evaluation");
      expect(classifyTask("critique this design")).toBe("evaluation");
      expect(classifyTask("assess the code quality")).toBe("evaluation");
    });

    test("detects comparison requests", () => {
      expect(classifyTask("compare these approaches")).toBe("evaluation");
      expect(classifyTask("what are the pros and cons?")).toBe("evaluation");
    });
  });

  describe("agentic tasks", () => {
    test("detects setup requests", () => {
      expect(classifyTask("set up the CI/CD pipeline")).toBe("agentic");
      expect(classifyTask("configure the database")).toBe("agentic");
      expect(classifyTask("deploy to production")).toBe("agentic");
    });

    test("detects multi-step indicators", () => {
      expect(classifyTask("build the entire feature end to end")).toBe("agentic");
    });
  });

  describe("edge cases", () => {
    test("handles empty input", () => {
      expect(classifyTask("")).toBe("synthesis"); // Default fallback
    });

    test("handles ambiguous input", () => {
      // Should return something reasonable, not crash
      const result = classifyTask("do it");
      expect(["code", "synthesis", "agentic"]).toContain(result);
    });
  });
});

describe("assessComplexity", () => {
  test("detects high complexity indicators", () => {
    expect(assessComplexity("this is a complex refactoring")).toBeGreaterThan(0.5);
    expect(assessComplexity("update multiple files across the codebase")).toBeGreaterThan(0.5);
  });

  test("detects low complexity indicators", () => {
    expect(assessComplexity("simple typo fix")).toBeLessThan(0.5);
    expect(assessComplexity("just update one line")).toBeLessThan(0.5);
  });

  test("returns middle range for neutral input", () => {
    const score = assessComplexity("update the function");
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(score).toBeLessThanOrEqual(0.7);
  });

  test("returns value between 0 and 1", () => {
    expect(assessComplexity("extremely complex task")).toBeLessThanOrEqual(1);
    expect(assessComplexity("trivial")).toBeGreaterThanOrEqual(0);
  });
});

describe("extractConstraints", () => {
  test("detects correctness-critical context", () => {
    const constraints = extractConstraints("fix the security vulnerability");
    expect(constraints.correctnessCritical).toBe(true);
  });

  test("detects production context", () => {
    const constraints = extractConstraints("update the production database");
    expect(constraints.correctnessCritical).toBe(true);
  });

  test("detects JSON output requirement", () => {
    const constraints = extractConstraints("return the result as JSON");
    expect(constraints.jsonOutput).toBe(true);
  });

  test("handles neutral context", () => {
    const constraints = extractConstraints("update the readme");
    expect(constraints.correctnessCritical).toBe(false);
    expect(constraints.jsonOutput).toBe(false);
  });
});
