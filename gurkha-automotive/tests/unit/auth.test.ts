import { beforeEach, describe, expect, it, vi } from "vitest";

let user: { id: string; email: string } | null = null;
let rpcResult: { data: unknown; error: unknown } = { data: true, error: null };
const rpc = vi.fn(async () => rpcResult);

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    rpc,
  }),
}));

const { getAdminSession } = await import("@/lib/auth");

beforeEach(() => {
  rpc.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getAdminSession", () => {
  it("is unauthenticated with no user", async () => {
    user = null;
    expect(await getAdminSession()).toEqual({ ok: false, reason: "unauthenticated" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("forbids a signed-in user who is not in admin_users", async () => {
    user = { id: "u1", email: "someone@example.com" };
    rpcResult = { data: false, error: null };
    expect(await getAdminSession()).toEqual({ ok: false, reason: "forbidden" });
    expect(rpc).toHaveBeenCalledWith("is_admin");
  });

  it("fails closed when is_admin() can't be called (migration not applied)", async () => {
    user = { id: "u1", email: "owner@example.com" };
    rpcResult = { data: null, error: { code: "PGRST202", message: "function not found" } };
    expect(await getAdminSession()).toEqual({ ok: false, reason: "forbidden" });
  });

  it("allows an admin", async () => {
    user = { id: "u1", email: "owner@example.com" };
    rpcResult = { data: true, error: null };
    expect(await getAdminSession()).toMatchObject({ ok: true, user: { id: "u1", email: "owner@example.com" } });
  });
});
