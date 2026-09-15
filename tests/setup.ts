// Vitest global setup. Server-only modules are stubbed so pure logic can be tested without Next runtime.
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
