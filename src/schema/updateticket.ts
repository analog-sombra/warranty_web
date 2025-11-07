import {
  InferInput,
  object,
  string,
  pipe,
  nullish,
  literal,
  union,
  maxLength,
} from "valibot";

const UpdateTicketSchema = object({
  status: union([
    literal("OPEN"),
    literal("IN_PROGRESS"), 
    literal("RESOLVED"),
  ], "Please select a valid status"),
  diagnostic_notes: nullish(
    pipe(
      string(),
      maxLength(500, "Diagnostic notes cannot exceed 500 characters")
    )
  ),
  resolution_notes: nullish(
    pipe(
      string(),
      maxLength(1000, "Resolution notes cannot exceed 1000 characters")
    )
  ),
});

type UpdateTicketForm = InferInput<typeof UpdateTicketSchema>;
export { UpdateTicketSchema, type UpdateTicketForm };