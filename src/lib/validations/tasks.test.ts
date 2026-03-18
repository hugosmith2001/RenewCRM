import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations/tasks";

// Valid CUID format (25 chars, starts with c)
const validCuid = "clh7k8q9r0000xyz00000000";

/**
 * Phase 7: Task validation (Zod schemas).
 *
 * Covers:
 * - createTaskSchema: title required and max 500, optional description/dueDate/priority/status/assignedToUserId,
 *   priority/status defaults (MEDIUM, PENDING), empty-string coercion for description/dueDate/assignedToUserId,
 *   valid priority/status enums, reject empty title, invalid date, invalid cuid for assignee.
 * - updateTaskSchema: partial fields, dueDate nullable, assignedToUserId empty string -> unassigned.
 *
 * Does not cover: API routes, DB, or schema composition.
 * Edge cases not exercised: exact boundary lengths, timezone edge cases for dueDate.
 */
describe("createTaskSchema", () => {
  it("accepts minimal valid input (title only)", () => {
    const result = createTaskSchema.safeParse({ title: "Follow up" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Follow up");
      expect(result.data.priority).toBe("MEDIUM");
      expect(result.data.status).toBe("PENDING");
      expect(result.data.description).toBeUndefined();
      expect(result.data.dueDate).toBeUndefined();
      expect(result.data.assignedToUserId).toBeUndefined();
    }
  });

  it("accepts full valid input", () => {
    const result = createTaskSchema.safeParse({
      title: "Renewal reminder",
      description: "Send quote before end of month",
      dueDate: "2025-04-15",
      priority: "HIGH",
      status: "PENDING",
      assignedToUserId: validCuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Renewal reminder");
      expect(result.data.description).toBe("Send quote before end of month");
      expect(result.data.priority).toBe("HIGH");
      expect(result.data.status).toBe("PENDING");
      expect(result.data.assignedToUserId).toBe(validCuid);
      expect(result.data.dueDate).toBeInstanceOf(Date);
    }
  });

  it("defaults priority to MEDIUM and status to PENDING when omitted", () => {
    const result = createTaskSchema.safeParse({ title: "Task" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("MEDIUM");
      expect(result.data.status).toBe("PENDING");
    }
  });

  it("accepts all priority values", () => {
    for (const priority of ["LOW", "MEDIUM", "HIGH"]) {
      const result = createTaskSchema.safeParse({ title: "T", priority });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.priority).toBe(priority);
    }
  });

  it("accepts all status values", () => {
    for (const status of ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]) {
      const result = createTaskSchema.safeParse({ title: "T", status });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe(status);
    }
  });

  it("coerces empty description and dueDate to undefined", () => {
    const result = createTaskSchema.safeParse({
      title: "T",
      description: "",
      dueDate: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.dueDate).toBeUndefined();
    }
  });

  it("coerces empty assignedToUserId to undefined (unassigned)", () => {
    const result = createTaskSchema.safeParse({
      title: "T",
      assignedToUserId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.assignedToUserId).toBeUndefined();
  });

  it("rejects empty title", () => {
    expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects missing title", () => {
    expect(createTaskSchema.safeParse({}).success).toBe(false);
    expect(
      createTaskSchema.safeParse({ priority: "HIGH" }).success
    ).toBe(false);
  });

  it("rejects title longer than 500", () => {
    expect(
      createTaskSchema.safeParse({ title: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("rejects invalid priority", () => {
    expect(
      createTaskSchema.safeParse({ title: "T", priority: "URGENT" }).success
    ).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(
      createTaskSchema.safeParse({ title: "T", status: "COMPLETED" }).success
    ).toBe(false);
  });

  it("coerces invalid date string for dueDate to undefined", () => {
    const result = createTaskSchema.safeParse({
      title: "T",
      dueDate: "not-a-date",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dueDate).toBeUndefined();
  });

  it("rejects invalid cuid for assignedToUserId", () => {
    expect(
      createTaskSchema.safeParse({ title: "T", assignedToUserId: "short" }).success
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({ title: "T", assignedToUserId: "x".repeat(30) }).success
    ).toBe(false);
  });

  it("rejects null/undefined body", () => {
    expect(createTaskSchema.safeParse(null).success).toBe(false);
    expect(createTaskSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts single field update", () => {
    const result = updateTaskSchema.safeParse({ title: "Updated title" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Updated title");
  });

  it("accepts status and priority update", () => {
    const result = updateTaskSchema.safeParse({
      status: "DONE",
      priority: "LOW",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("DONE");
      expect(result.data.priority).toBe("LOW");
    }
  });

  it("accepts dueDate null (clear due date)", () => {
    const result = updateTaskSchema.safeParse({ dueDate: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dueDate).toBeNull();
  });

  it("accepts assignedToUserId empty string (unassign)", () => {
    const result = updateTaskSchema.safeParse({ assignedToUserId: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.assignedToUserId).toBeUndefined();
  });

  it("rejects title longer than 500 in partial", () => {
    expect(
      updateTaskSchema.safeParse({ title: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("rejects empty title in partial", () => {
    expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects invalid type for status", () => {
    expect(
      updateTaskSchema.safeParse({ status: "FINISHED" }).success
    ).toBe(false);
  });
});
