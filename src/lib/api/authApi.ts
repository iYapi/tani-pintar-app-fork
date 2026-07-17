export const authApi = {
  async register(data: { fullName: string; phoneNumber: string; role: "farmer" | "buyer" }) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async login(data: { phoneNumber: string }) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async verifyOtp(data: { phoneNumber: string; otp: string }) {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async resendOtp(data: { phoneNumber: string; purpose: "REGISTER" | "LOGIN" }) {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getMe() {
    const res = await fetch("/api/auth/me");
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  async logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.json();
  }
};
