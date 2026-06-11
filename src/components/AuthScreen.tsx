import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, LogIn, UserPlus, KeyRound, AlertCircle, HelpCircle, ArrowLeft, Mail, Lock, User, CheckCircle } from "lucide-react";

export default function AuthScreen() {
  const { signInWithGoogle, registerWithEmailAndName, loginWithEmail, resetPassword } = useAuth();
  
  // Modes: "login" | "signup" | "forgot"
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  
  // Input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  
  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Field validation and form submission handles
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Basic common validations
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "login" || mode === "signup") {
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters in length.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        if (!displayName.trim()) {
          setError("Please supply a scout/operator name.");
          setLoading(false);
          return;
        }
        await registerWithEmailAndName(email.trim(), password, displayName.trim());
        setSuccessMessage("Account created successfully! Connecting session...");
      } else if (mode === "forgot") {
        await resetPassword(email.trim());
        setSuccessMessage("A password recovery link has been dispatched to your email address!");
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = "An unexpected authentication error occurred. Please try again.";
      if (err.code === "auth/invalid-credential") {
        errMsg = "Incorrect email or password indicator. Verify parameters and try again.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "Registration blocked: An account already exists with this email address.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Selected password is too weak. Choose a stronger combination.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "No active scout registration found with this email.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google authentication was aborted or declined by browser configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative ambient natural grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3E7250_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[440px] bg-white rounded-3xl border border-[#ECE1D4] shadow-md relative z-10 overflow-hidden"
      >
        {/* Visual Brand Header Section */}
        <div className="bg-[#3E7250]/5 border-b border-[#ECE1D4]/60 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-3 text-[#3E7250] shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#2C2112] tracking-tight">FarmMind AI</h2>
          <p className="text-[11px] font-mono font-extrabold text-[#3E7250] uppercase tracking-widest mt-0.5">
            Secured Telemetry Scouting
          </p>
        </div>

        {/* Dynamic Alerts/Feedback */}
        <div className="px-6 pt-4">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3.5 bg-red-50 border border-red-200/50 rounded-xl flex items-start gap-2.5 text-xs text-red-700 font-semibold"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-snug">{error}</p>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3.5 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-start gap-2.5 text-xs text-[#3E7250] font-semibold"
              >
                <CheckCircle className="w-4 h-4 text-[#3E7250] shrink-0 mt-0.5" />
                <p className="leading-snug">{successMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display Name - Only in Sign Up mode */}
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8C7D6E] uppercase tracking-wider block">
                  Scout Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#A39485]" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full name or callsign"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#ECE1D4] focus:border-[#3E7250] rounded-xl text-xs font-semibold text-[#2C2112] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#8C7D6E] uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#A39485]" />
                <input
                  type="email"
                  required
                  placeholder="name@farm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#ECE1D4] focus:border-[#3E7250] rounded-xl text-xs font-semibold text-[#2C2112] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password field - Only in Login or Sign Up mode */}
            {mode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8C7D6E] uppercase tracking-wider">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccessMessage(null);
                        setMode("forgot");
                      }}
                      className="text-[11px] font-bold text-[#3E7250] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#A39485]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#ECE1D4] focus:border-[#3E7250] rounded-xl text-xs font-semibold text-[#2C2112] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password - Only in Sign Up mode */}
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8C7D6E] uppercase tracking-wider block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-[#A39485]" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#ECE1D4] focus:border-[#3E7250] rounded-xl text-xs font-semibold text-[#2C2112] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3E7250] hover:bg-[#2E5A3E] text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : mode === "login" ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In securely
                </>
              ) : mode === "signup" ? (
                <>
                  <UserPlus className="w-4 h-4" /> Finalize Account
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Request Password Reset
                </>
              )}
            </button>
          </form>

          {/* Federated Google Provider (Only for SignIn/SignUp modes) */}
          {mode !== "forgot" && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[1px] bg-[#ECE1D4]"></div>
                <span className="text-[10px] font-mono text-[#A39485] font-black uppercase tracking-wider">
                  OR USE
                </span>
                <div className="flex-1 h-[1px] bg-[#ECE1D4]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-[#FAF7F3] text-[#2C2112] border border-[#ECE1D4] font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.3 7.57 8.94 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.46h6.44c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.36 14.5c-.24-.72-.38-1.5-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.84 0 11.02 0 13.3c0 2.28.54 4.46 1.5 6.4l3.86-3.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.12.75-2.54 1.2-4.3 1.2-3.06 0-5.7-2.53-6.64-5.46L1.5 16.2C3.4 20.05 7.35 23 12 23z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          {/* Toggle Screen Mode Links */}
          <div className="mt-5 text-center">
            {mode === "login" ? (
              <p className="text-xs text-[#8C7D6E] font-medium">
                Not a registered operator?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode("signup");
                  }}
                  className="font-black text-[#3E7250] hover:underline cursor-pointer"
                >
                  Create Scout profile
                </button>
              </p>
            ) : mode === "signup" ? (
              <p className="text-xs text-[#8C7D6E] font-medium">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    setMode("login");
                  }}
                  className="font-black text-[#3E7250] hover:underline cursor-pointer"
                >
                  Sign In instead
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode("login");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-[#54473C] hover:text-[#3E7250] font-extrabold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Helpful administrative info about Console setup */}
      <div className="mt-8 text-center max-w-sm px-4">
        <p className="text-[10px] text-[#A39485] font-semibold leading-relaxed">
          🔒 Secured via Firebase. Google Sign-In is pre-integrated. When using email/password signup, make sure the Email/Password sign-in provider is enabled in your Firebase console.
        </p>
      </div>
    </div>
  );
}
