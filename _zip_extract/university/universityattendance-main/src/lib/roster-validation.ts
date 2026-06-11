import { z } from "zod";
import rosterData from "../data-roster.json";

const OVERRIDE_KEY = "ap_roster_override_v1";

function loadOverride(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRosterOverride(data: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
}

export function clearRosterOverride() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OVERRIDE_KEY);
}

export function hasRosterOverride(): boolean {
  return loadOverride() !== null;
}

/**
 * Schema for a single roster row. Mirrors the CSV header contract:
 *   Student ID, Student Name Ar, Group, Advisor
 * (NO. is just a row index in the CSV and is intentionally dropped.)
 */
export const StudentSchema = z.object({
  id: z
    .string({ required_error: "Student ID is required" })
    .trim()
    .regex(/^\d{6,12}$/, "Student ID must be 6–12 digits"),
  name: z
    .string({ required_error: "Student Name (Ar) is required" })
    .trim()
    .min(2, "Student Name (Ar) must be at least 2 characters")
    .max(120, "Student Name (Ar) is too long"),
  group: z.enum(["G1", "G2", "G3", "G4"], {
    errorMap: () => ({ message: "Group must be one of G1, G2, G3, G4" }),
  }),
  advisor: z
    .string({ required_error: "Advisor is required" })
    .trim()
    .min(2, "Advisor must be at least 2 characters")
    .max(200, "Advisor is too long"),
});

export type ValidStudent = z.infer<typeof StudentSchema>;

export type RosterIssue = {
  rowIndex: number; // 0-based index in the source file (after header)
  studentId?: string;
  field: string;
  message: string;
};

export type RosterValidationResult =
  | { ok: true; data: ValidStudent[] }
  | {
      ok: false;
      issues: RosterIssue[];
      partial: ValidStudent[]; // rows that did validate, in case caller wants them
    };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Validate any raw roster payload against the schema. */
export function validateRoster(raw: unknown): RosterValidationResult {
  const issues: RosterIssue[] = [];
  const partial: ValidStudent[] = [];

  if (!Array.isArray(raw)) {
    return {
      ok: false,
      partial,
      issues: [
        {
          rowIndex: -1,
          field: "<root>",
          message: "Roster file must be a JSON array of student records.",
        },
      ],
    };
  }

  const seenIds = new Set<string>();

  raw.forEach((row, i) => {
    if (!isRecord(row)) {
      issues.push({
        rowIndex: i,
        field: "<row>",
        message: "Row is not an object",
      });
      return;
    }

    const result = StudentSchema.safeParse(row);
    if (!result.success) {
      for (const err of result.error.issues) {
        issues.push({
          rowIndex: i,
          studentId:
            typeof row.id === "string" ? row.id : undefined,
          field: err.path.join(".") || "<row>",
          message: err.message,
        });
      }
      return;
    }

    if (seenIds.has(result.data.id)) {
      issues.push({
        rowIndex: i,
        studentId: result.data.id,
        field: "id",
        message: `Duplicate Student ID ${result.data.id}`,
      });
      return;
    }
    seenIds.add(result.data.id);
    partial.push(result.data);
  });

  if (issues.length > 0) return { ok: false, issues, partial };
  return { ok: true, data: partial };
}

/** Run validation against the bundled roster JSON once, at module load. */
export const ROSTER_VALIDATION: RosterValidationResult = validateRoster(
  loadOverride() ?? rosterData,
);